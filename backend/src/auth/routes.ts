import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  activateInputSchema,
  loginInputSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerInputSchema,
} from "./validation";
import type { AuthService } from "./service";
import { buildSessionCookie, SESSION_COOKIE_NAME } from "../lib/sessions";
import type { AuthVariables } from "./middleware";

// Konfiguracja cookie sesyjnego — przekazywana z `index.ts` (zna `secure`
// per środowisko: dev false, prod true) i TTL zsynchronizowany z serwisem.
export interface AuthRoutesConfig {
  sessionCookieSecure: boolean;
  sessionCookieMaxAgeSeconds: number;
}

export function createAuthApp(
  getService: (c: Context) => AuthService,
  getConfig: (c: Context) => AuthRoutesConfig,
) {
  const app = new Hono<{ Variables: AuthVariables }>();

  function setSessionCookie(c: Context, token: string) {
    const cfg = getConfig(c);
    c.header(
      "Set-Cookie",
      buildSessionCookie(token, {
        maxAgeSeconds: cfg.sessionCookieMaxAgeSeconds,
        secure: cfg.sessionCookieSecure,
      }),
      { append: true },
    );
  }

  function clearSessionCookie(c: Context) {
    const cfg = getConfig(c);
    c.header(
      "Set-Cookie",
      buildSessionCookie("", {
        maxAgeSeconds: 0,
        secure: cfg.sessionCookieSecure,
      }),
      { append: true },
    );
  }

  app.post("/register", zValidator("json", registerInputSchema), async (c) => {
    const body = c.req.valid("json");
    await getService(c).register({
      email: body.email,
      displayName: body.displayName ?? null,
    });
    // Zawsze 200 — patrz komentarz w serwisie (anti-enumeration).
    return c.json({ ok: true }, 200);
  });

  app.post("/activate", zValidator("json", activateInputSchema), async (c) => {
    const body = c.req.valid("json");
    const result = await getService(c).activate(body);
    if (!result.ok) {
      return c.json({ error: "Link aktywacyjny jest niepoprawny lub wygasł" }, 400);
    }
    setSessionCookie(c, result.sessionToken);
    return c.json({ user: result.user }, 200);
  });

  app.post("/login", zValidator("json", loginInputSchema), async (c) => {
    const body = c.req.valid("json");
    const result = await getService(c).login(body);
    if (!result.ok) {
      if (result.reason === "inactive") {
        return c.json(
          { error: "Konto nieaktywne — kliknij link aktywacyjny z maila" },
          403,
        );
      }
      return c.json({ error: "Niepoprawny e-mail lub hasło" }, 401);
    }
    setSessionCookie(c, result.sessionToken);
    return c.json({ user: result.user }, 200);
  });

  app.post("/logout", async (c) => {
    // Logout jest idempotentny — nawet bez sesji zwracamy 200 i czyścimy cookie.
    const cookieHeader = c.req.header("cookie") ?? "";
    const m = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`),
    );
    if (m) await getService(c).logout(m[1]);
    clearSessionCookie(c);
    return c.json({ ok: true }, 200);
  });

  app.post(
    "/password-reset/request",
    zValidator("json", passwordResetRequestSchema),
    async (c) => {
      const body = c.req.valid("json");
      await getService(c).requestPasswordReset({ email: body.email });
      return c.json({ ok: true }, 200);
    },
  );

  app.post(
    "/password-reset/confirm",
    zValidator("json", passwordResetConfirmSchema),
    async (c) => {
      const body = c.req.valid("json");
      const r = await getService(c).resetPassword(body);
      if (!r.ok) {
        return c.json({ error: "Link resetu hasła jest niepoprawny lub wygasł" }, 400);
      }
      return c.json({ ok: true }, 200);
    },
  );

  app.get("/me", async (c) => {
    // currentUser jest wstawiony przez middleware kontekstowe (przed mount).
    const user = c.get("currentUser");
    if (!user) return c.json({ user: null }, 200);
    return c.json({ user }, 200);
  });

  return app;
}
