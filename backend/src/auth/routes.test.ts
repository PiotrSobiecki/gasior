import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createAuthApp } from "./routes";
import { createAuthContextMiddleware } from "./middleware";
import { createAuthService, type AuthService } from "./service";
import { createInMemoryAuthRepo } from "./repo.in-memory";
import {
  createInMemoryEmailTransport,
  type InMemoryEmailTransport,
} from "../lib/email.in-memory";
import { SESSION_COOKIE_NAME } from "../lib/sessions";
import type { AuthVariables } from "./middleware";

// Buduje minimalną aplikację z auth middleware + auth app pod /auth.
function makeApp(svc: AuthService) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("*", createAuthContextMiddleware(() => svc));
  app.route(
    "/auth",
    createAuthApp(
      () => svc,
      () => ({ sessionCookieSecure: false, sessionCookieMaxAgeSeconds: 3600 }),
    ),
  );
  return app;
}

function extractTokenFromLink(text: string): string {
  const m = text.match(/[?&]token=([A-Za-z0-9_%-]+)/);
  if (!m) throw new Error(`No link in mail: ${text}`);
  return decodeURIComponent(m[1]);
}

// Wyciąga wartość cookie z headera Set-Cookie po nazwie.
function getCookieValue(setCookie: string | null, name: string): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}

describe("auth routes", () => {
  let repo: ReturnType<typeof createInMemoryAuthRepo>;
  let mail: InMemoryEmailTransport;
  let svc: AuthService;
  let app: Hono<{ Variables: AuthVariables }>;

  beforeEach(() => {
    repo = createInMemoryAuthRepo();
    mail = createInMemoryEmailTransport();
    svc = createAuthService({
      repo,
      mail,
      frontendOrigin: "http://localhost:5173",
      mailFrom: "noreply@x",
      passwordHashOptions: { iterations: 1000 },
    });
    app = makeApp(svc);
  });

  it("POST /auth/register zwraca 200 i wysyła maila", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    expect(res.status).toBe(200);
    expect(mail.sent).toHaveLength(1);
  });

  it("POST /auth/register z niepoprawnym e-mailem zwraca 400", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /auth/activate ustawia cookie sesyjne i zwraca usera", async () => {
    await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const token = extractTokenFromLink(mail.sent[0].text);

    const res = await app.request("/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "long-enough-pass" }),
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).not.toMatch(/Secure/); // dev: secure=false

    const body = (await res.json()) as { user: { email: string; status: string } };
    expect(body.user.email).toBe("a@b.com");
    expect(body.user.status).toBe("active");
  });

  it("POST /auth/activate z błędnym tokenem zwraca 400", async () => {
    const res = await app.request("/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "nope", password: "long-enough-pass" }),
    });
    expect(res.status).toBe(400);
  });

  it("happy path: register → activate → login → /me → logout", async () => {
    // register
    await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const actToken = extractTokenFromLink(mail.sent[0].text);

    // activate
    const actRes = await app.request("/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: actToken, password: "long-enough-pass" }),
    });
    expect(actRes.status).toBe(200);

    // logout (po aktywacji jesteśmy zalogowani, ale chcemy świeży login)
    const session1 = getCookieValue(actRes.headers.get("set-cookie"), SESSION_COOKIE_NAME);
    expect(session1).toBeTruthy();

    // login
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "long-enough-pass" }),
    });
    expect(loginRes.status).toBe(200);
    const session2 = getCookieValue(loginRes.headers.get("set-cookie"), SESSION_COOKIE_NAME);
    expect(session2).toBeTruthy();

    // /me z cookie
    const meRes = await app.request("/auth/me", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session2}` },
    });
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as { user: { email: string } | null };
    expect(meBody.user?.email).toBe("a@b.com");

    // /me bez cookie → user=null
    const meAnon = await app.request("/auth/me");
    expect(meAnon.status).toBe(200);
    const meAnonBody = (await meAnon.json()) as { user: unknown };
    expect(meAnonBody.user).toBeNull();

    // logout — z cookie
    const logoutRes = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session2}` },
    });
    expect(logoutRes.status).toBe(200);
    // Set-Cookie czyści sesję (Max-Age=0).
    expect(logoutRes.headers.get("set-cookie")).toMatch(/Max-Age=0/);

    // Po logout cookie nie jest już ważne.
    const meAfter = await app.request("/auth/me", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session2}` },
    });
    const meAfterBody = (await meAfter.json()) as { user: unknown };
    expect(meAfterBody.user).toBeNull();
  });

  it("POST /auth/login zwraca 401 dla błędnego hasła", async () => {
    // register + activate
    await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const actToken = extractTokenFromLink(mail.sent[0].text);
    await app.request("/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: actToken, password: "long-enough-pass" }),
    });

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /auth/login zwraca 403 gdy konto nie zostało aktywowane", async () => {
    await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "pending@example.com" }),
    });
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "pending@example.com",
        password: "anything-long-enough",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("password reset flow: request → confirm → login nowym hasłem", async () => {
    // register + activate ze starym hasłem
    await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const actToken = extractTokenFromLink(mail.sent[0].text);
    await app.request("/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: actToken, password: "old-password-1" }),
    });
    mail.reset();

    // request reset
    const reqRes = await app.request("/auth/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    expect(reqRes.status).toBe(200);
    expect(mail.sent).toHaveLength(1);
    const resetToken = extractTokenFromLink(mail.sent[0].text);

    // confirm
    const confirmRes = await app.request("/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: "new-password-2" }),
    });
    expect(confirmRes.status).toBe(200);

    // login nowym hasłem
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "new-password-2" }),
    });
    expect(loginRes.status).toBe(200);
  });
});
