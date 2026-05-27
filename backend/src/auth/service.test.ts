import { describe, it, expect, beforeEach } from "vitest";
import { createAuthService, type AuthService } from "./service";
import { createInMemoryAuthRepo } from "./repo.in-memory";
import {
  createInMemoryEmailTransport,
  type InMemoryEmailTransport,
} from "../lib/email.in-memory";
import type { AuthRepo } from "./repo";

const FAST_HASH = { iterations: 1000 } as const;
const FRONTEND_ORIGIN = "http://localhost:5173";
const NOW = new Date("2026-05-26T18:00:00Z");

describe("AuthService", () => {
  let repo: AuthRepo;
  let mail: InMemoryEmailTransport;
  let svc: AuthService;
  let clock: Date;

  beforeEach(() => {
    repo = createInMemoryAuthRepo();
    mail = createInMemoryEmailTransport();
    clock = new Date(NOW);
    svc = createAuthService({
      repo,
      mail,
      frontendOrigin: FRONTEND_ORIGIN,
      mailFrom: "Bimbrownik <noreply@example.com>",
      now: () => clock,
      passwordHashOptions: FAST_HASH,
    });
  });

  describe("register", () => {
    it("creates a pending user and sends an activation email with the link", async () => {
      const res = await svc.register({ email: "Ada@Example.com", displayName: "Ada" });
      expect(res.ok).toBe(true);

      const user = await repo.getUserByEmail("ada@example.com");
      expect(user?.status).toBe("pending");
      expect(user?.email).toBe("ada@example.com");
      expect(user?.passwordHash).toBeNull();

      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe("ada@example.com");
      expect(mail.sent[0].subject).toMatch(/aktyw/i);
      // Link zawiera frontend origin + ścieżkę aktywacji + jakiś token.
      expect(mail.sent[0].text).toContain(`${FRONTEND_ORIGIN}/aktywacja?token=`);
    });

    it("does not reveal whether email already exists (idempotent response)", async () => {
      // Pierwsze użycie OK.
      await svc.register({ email: "dup@example.com", displayName: null });
      mail.reset();

      // Drugie użycie tym samym mailem: serwis MUSI zwrócić ok=true, ale
      // NIE może utworzyć drugiego rekordu ani wyciec informacji "user exists".
      // (Zapobiega enumeration; ewentualnie wysyłamy "ktoś próbował zarejestrować
      //  twój adres — zaloguj się" — opcjonalne, na razie po prostu cisza.)
      const res = await svc.register({ email: "DUP@example.com", displayName: null });
      expect(res.ok).toBe(true);
      // Brak nowego maila aktywacyjnego — istniejący user nie dostaje powtórki.
      expect(mail.sent).toHaveLength(0);
    });
  });

  describe("activate", () => {
    it("activates the user and stores the password hash; consumes the token", async () => {
      await svc.register({ email: "a@b.com", displayName: null });
      const token = extractTokenFromLink(mail.sent[0].text);

      const result = await svc.activate({ token, password: "long-enough-pass" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user.email).toBe("a@b.com");
        expect(result.user.status).toBe("active");
        // Sesja jest tworzona przy aktywacji — user jest "od razu zalogowany".
        expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]+$/);
      }

      const user = await repo.getUserByEmail("a@b.com");
      expect(user?.passwordHash).toMatch(/^pbkdf2-sha256\$/);
      expect(user?.status).toBe("active");

      // Token już skonsumowany — drugie użycie odrzucone.
      const second = await svc.activate({ token, password: "long-enough-pass" });
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.reason).toBe("invalid-token");
    });

    it("rejects an unknown token", async () => {
      const r = await svc.activate({ token: "nope", password: "long-enough-pass" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-token");
    });

    it("rejects an expired token", async () => {
      await svc.register({ email: "a@b.com", displayName: null });
      const token = extractTokenFromLink(mail.sent[0].text);

      // Przesuwamy zegar o 48h — token aktywacyjny ma TTL 24h.
      clock = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);

      const r = await svc.activate({ token, password: "long-enough-pass" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-token");
    });
  });

  describe("login", () => {
    async function registerAndActivate(email: string, password: string) {
      await svc.register({ email, displayName: null });
      const token = extractTokenFromLink(mail.sent[mail.sent.length - 1].text);
      const r = await svc.activate({ token, password });
      if (!r.ok) throw new Error(`activate failed: ${r.reason}`);
      return r;
    }

    it("returns a session for a correct email/password", async () => {
      await registerAndActivate("a@b.com", "supersecure1");
      const r = await svc.login({ email: "a@b.com", password: "supersecure1" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.sessionToken).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(r.user.email).toBe("a@b.com");
      }
    });

    it("returns invalid-credentials for wrong password (and does NOT leak that user exists)", async () => {
      await registerAndActivate("a@b.com", "supersecure1");
      const r = await svc.login({ email: "a@b.com", password: "wrong" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-credentials");
    });

    it("returns invalid-credentials for unknown email (same reason as bad password)", async () => {
      const r = await svc.login({ email: "ghost@example.com", password: "anything" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-credentials");
    });

    it("returns inactive when user is registered but not activated", async () => {
      await svc.register({ email: "pending@example.com", displayName: null });
      const r = await svc.login({ email: "pending@example.com", password: "anything" });
      expect(r.ok).toBe(false);
      // Świadomie wypuszczamy "inactive" jako osobny powód — w UI pokażemy
      // "potwierdź konto z linku w mailu". Akceptowane minimalne enumeration:
      // ktoś może sprawdzić, czy adres jest "pending vs unknown", ale i tak
      // wysyłka linku odbywa się tylko przy register.
      if (!r.ok) expect(r.reason).toBe("inactive");
    });
  });

  describe("logout", () => {
    it("deletes the session for a given token", async () => {
      await svc.register({ email: "a@b.com", displayName: null });
      const token = extractTokenFromLink(mail.sent[0].text);
      const act = await svc.activate({ token, password: "long-enough-pass" });
      if (!act.ok) throw new Error("activate failed");

      const before = await svc.currentUserBySessionToken(act.sessionToken);
      expect(before?.email).toBe("a@b.com");

      await svc.logout(act.sessionToken);

      const after = await svc.currentUserBySessionToken(act.sessionToken);
      expect(after).toBeNull();
    });
  });

  describe("password reset", () => {
    async function registerAndActivate(email: string, password: string) {
      await svc.register({ email, displayName: null });
      const token = extractTokenFromLink(mail.sent[mail.sent.length - 1].text);
      await svc.activate({ token, password });
    }

    it("requesting a reset on an unknown email returns ok (no enumeration) but sends no mail", async () => {
      const r = await svc.requestPasswordReset({ email: "ghost@example.com" });
      expect(r.ok).toBe(true);
      expect(mail.sent).toHaveLength(0);
    });

    it("sends a reset link for an existing user; confirm updates the password", async () => {
      await registerAndActivate("a@b.com", "old-password-1");
      mail.reset();

      const req = await svc.requestPasswordReset({ email: "a@b.com" });
      expect(req.ok).toBe(true);
      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].text).toContain(`${FRONTEND_ORIGIN}/reset-hasla?token=`);
      const resetToken = extractTokenFromLink(mail.sent[0].text);

      const confirm = await svc.resetPassword({
        token: resetToken,
        password: "new-password-2",
      });
      expect(confirm.ok).toBe(true);

      const stillOld = await svc.login({ email: "a@b.com", password: "old-password-1" });
      expect(stillOld.ok).toBe(false);
      const withNew = await svc.login({ email: "a@b.com", password: "new-password-2" });
      expect(withNew.ok).toBe(true);
    });

    it("rejects a reset token that was used for activation (kind mismatch)", async () => {
      await svc.register({ email: "a@b.com", displayName: null });
      const activationToken = extractTokenFromLink(mail.sent[0].text);
      const r = await svc.resetPassword({
        token: activationToken,
        password: "long-enough-pass",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-token");
    });
  });

  describe("currentUserBySessionToken", () => {
    it("returns null for unknown / expired tokens", async () => {
      expect(await svc.currentUserBySessionToken("nope")).toBeNull();
    });

    it("returns the user for a valid session token", async () => {
      await svc.register({ email: "a@b.com", displayName: null });
      const token = extractTokenFromLink(mail.sent[0].text);
      const r = await svc.activate({ token, password: "long-enough-pass" });
      if (!r.ok) throw new Error("activate failed");

      const me = await svc.currentUserBySessionToken(r.sessionToken);
      expect(me?.email).toBe("a@b.com");
      expect(me).not.toHaveProperty("passwordHash");
    });
  });
});

// W mailu link wygląda jak `${FRONTEND_ORIGIN}/aktywacja?token=<token>` lub
// `.../reset-hasla?token=<token>` — wyciągamy wartość parametru `token`.
function extractTokenFromLink(text: string): string {
  const m = text.match(/[?&]token=([A-Za-z0-9_%-]+)/);
  if (!m) throw new Error(`No activation/reset link in:\n${text}`);
  return decodeURIComponent(m[1]);
}
