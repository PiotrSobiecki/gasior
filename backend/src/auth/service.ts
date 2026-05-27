import type { AuthRepo, UserPublic } from "./repo";
import { toPublicUser } from "./repo";
import type { EmailTransport } from "../lib/email";
import { hashPassword, verifyPassword, type HashOptions } from "../lib/passwords";
import {
  generateSessionToken,
  hashSessionToken,
} from "../lib/sessions";

// --- typy publiczne (wyjścia serwisu) ---

export type RegisterInput = { email: string; displayName: string | null };
export type RegisterResult = { ok: true };

export type ActivateInput = { token: string; password: string };
export type ActivateResult =
  | { ok: true; user: UserPublic; sessionToken: string }
  | { ok: false; reason: "invalid-token" };

export type LoginInput = { email: string; password: string };
export type LoginResult =
  | { ok: true; user: UserPublic; sessionToken: string }
  | { ok: false; reason: "invalid-credentials" | "inactive" };

export type RequestPasswordResetInput = { email: string };
export type RequestPasswordResetResult = { ok: true };

export type ResetPasswordInput = { token: string; password: string };
export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: "invalid-token" };

export interface AuthService {
  register(input: RegisterInput): Promise<RegisterResult>;
  activate(input: ActivateInput): Promise<ActivateResult>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(sessionToken: string): Promise<void>;
  requestPasswordReset(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResult>;
  resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult>;
  currentUserBySessionToken(sessionToken: string): Promise<UserPublic | null>;
}

// --- konfiguracja / DI ---

export interface AuthServiceDeps {
  repo: AuthRepo;
  mail: EmailTransport;
  frontendOrigin: string;   // np. "https://bimbrownik.app" — do linków w mailach
  mailFrom: string;         // np. "Bimbrownik <noreply@...>"
  now?: () => Date;         // testy mogą zamrozić zegar
  // Generator surowego tokenu (32B base64url) — pozwala podmienić w testach
  // na deterministyczny, ale domyślnie crypto.getRandomValues.
  generateRawToken?: () => string;
  passwordHashOptions?: HashOptions; // override iteracji (w testach 1000)
  // TTLs są stałe per typ — jawnie podane, łatwo zmienić w jednym miejscu.
  activationTokenTtlHours?: number;
  resetTokenTtlHours?: number;
  sessionTtlDays?: number;
}

const DEFAULT_ACTIVATION_TTL_HOURS = 24;
const DEFAULT_RESET_TTL_HOURS = 1;
const DEFAULT_SESSION_TTL_DAYS = 30;

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const now = deps.now ?? (() => new Date());
  const genRawToken = deps.generateRawToken ?? generateSessionToken;
  const hashOpts = deps.passwordHashOptions;
  const activationTtlMs =
    (deps.activationTokenTtlHours ?? DEFAULT_ACTIVATION_TTL_HOURS) * 60 * 60 * 1000;
  const resetTtlMs = (deps.resetTokenTtlHours ?? DEFAULT_RESET_TTL_HOURS) * 60 * 60 * 1000;
  const sessionTtlMs =
    (deps.sessionTtlDays ?? DEFAULT_SESSION_TTL_DAYS) * 24 * 60 * 60 * 1000;

  async function issueToken(opts: {
    userId: string;
    kind: "activation" | "password_reset";
    ttlMs: number;
  }): Promise<string> {
    const raw = genRawToken();
    const tokenHash = await hashSessionToken(raw);
    const expiresAt = new Date(now().getTime() + opts.ttlMs).toISOString();
    await deps.repo.createToken({
      userId: opts.userId,
      kind: opts.kind,
      tokenHash,
      expiresAt,
    });
    return raw;
  }

  async function createSession(userId: string): Promise<string> {
    const raw = genRawToken();
    const tokenHash = await hashSessionToken(raw);
    const expiresAt = new Date(now().getTime() + sessionTtlMs).toISOString();
    await deps.repo.createSession({ userId, tokenHash, expiresAt });
    return raw;
  }

  function buildTransactionalHtml(opts: {
    title: string;
    intro: string;
    ctaLabel: string;
    ctaLink: string;
    ttlNote: string;
  }): string {
    const safeLink = opts.ctaLink.replace(/"/g, "&quot;");
    return `
<!doctype html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#faf6ef;font-family:Arial,Helvetica,sans-serif;color:#2a211c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf6ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7dfd2;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#6b1f2a;color:#faf6ef;padding:18px 22px;font-size:20px;font-weight:700;">
                Gąsior
              </td>
            </tr>
            <tr>
              <td style="padding:24px 22px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#6b1f2a;">${opts.title}</h1>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3f332b;">${opts.intro}</p>
                <p style="margin:0 0 20px;">
                  <a href="${safeLink}" style="display:inline-block;background:#d98324;color:#4a1a24;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;font-size:14px;">
                    ${opts.ctaLabel}
                  </a>
                </p>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6a5a4f;">${opts.ttlNote}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8a7a6c;">
                  Jeśli przycisk nie działa, skopiuj ten link:<br />
                  <a href="${safeLink}" style="color:#6b1f2a;word-break:break-all;">${opts.ctaLink}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
  }

  function buildActivationEmail(to: string, link: string) {
    return {
      to,
      subject: "Aktywuj konto w Gąsiorze",
      text:
        `Cześć!\n\n` +
        `Aby zakończyć zakładanie konta w Gąsiorze, ustaw hasło pod tym linkiem:\n` +
        `${link}\n\n` +
        `Link jest ważny 24 godziny. Jeśli to nie Ty się rejestrowałeś — zignoruj tę wiadomość.\n`,
      html: buildTransactionalHtml({
        title: "Aktywuj konto w Gąsiorze",
        intro:
          "Dziękujemy za rejestrację. Kliknij przycisk poniżej, aby ustawić hasło i aktywować konto.",
        ctaLabel: "Aktywuj konto",
        ctaLink: link,
        ttlNote:
          "Link aktywacyjny jest ważny przez 24 godziny. Jeśli to nie Ty się rejestrowałeś, zignoruj tę wiadomość.",
      }),
    };
  }

  function buildResetEmail(to: string, link: string) {
    return {
      to,
      subject: "Reset hasła w Gąsiorze",
      text:
        `Cześć!\n\n` +
        `Kliknij w link, żeby ustawić nowe hasło:\n` +
        `${link}\n\n` +
        `Link jest ważny 1 godzinę. Jeśli to nie Ty prosiłeś o reset — zignoruj tę wiadomość.\n`,
      html: buildTransactionalHtml({
        title: "Reset hasła w Gąsiorze",
        intro:
          "Otrzymaliśmy prośbę o zmianę hasła. Kliknij przycisk poniżej, aby ustawić nowe hasło.",
        ctaLabel: "Ustaw nowe hasło",
        ctaLink: link,
        ttlNote:
          "Link do resetu jest ważny przez 1 godzinę. Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość.",
      }),
    };
  }

  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();
      const existing = await deps.repo.getUserByEmail(email);
      if (existing) {
        // Świadomie zwracamy ok=true bez tworzenia nowego konta ani wysłania
        // maila — to chroni przed user enumeration (atakujący nie odróżni
        // "istnieje" od "nie istnieje" po response time / treści).
        return { ok: true };
      }
      const user = await deps.repo.createUser({
        email,
        displayName: input.displayName ?? null,
      });
      const rawToken = await issueToken({
        userId: user.id,
        kind: "activation",
        ttlMs: activationTtlMs,
      });
      // Format zgodny z frontową ścieżką /aktywacja (token jako query-param).
      const link = `${deps.frontendOrigin}/aktywacja?token=${encodeURIComponent(rawToken)}`;
      await deps.mail.send(buildActivationEmail(user.email, link));
      return { ok: true };
    },

    async activate(input) {
      const tokenHash = await hashSessionToken(input.token);
      const consumed = await deps.repo.consumeToken(tokenHash, "activation", now());
      if (!consumed) return { ok: false, reason: "invalid-token" };

      const user = await deps.repo.getUserById(consumed.userId);
      if (!user) return { ok: false, reason: "invalid-token" };

      const passwordHash = await hashPassword(input.password, hashOpts);
      await deps.repo.setUserPassword(user.id, passwordHash);
      await deps.repo.setUserStatus(user.id, "active");

      const sessionToken = await createSession(user.id);
      // Zwracamy świeży snapshot — passwordHash już ustawiony, status="active".
      return {
        ok: true,
        user: toPublicUser({ ...user, passwordHash, status: "active" }),
        sessionToken,
      };
    },

    async login(input) {
      const email = input.email.trim().toLowerCase();
      const user = await deps.repo.getUserByEmail(email);
      if (!user) {
        // Aby ataki czasowe były trudniejsze, można by tu wciąż wywołać
        // verifyPassword na dummy-hashu. Dla hobby app pomijamy — Workers
        // i tak mają mało stabilne timingi (cold-start).
        return { ok: false, reason: "invalid-credentials" };
      }
      if (user.status !== "active" || !user.passwordHash) {
        return { ok: false, reason: "inactive" };
      }
      const okPass = await verifyPassword(input.password, user.passwordHash);
      if (!okPass) return { ok: false, reason: "invalid-credentials" };

      const sessionToken = await createSession(user.id);
      return { ok: true, user: toPublicUser(user), sessionToken };
    },

    async logout(sessionToken) {
      const tokenHash = await hashSessionToken(sessionToken);
      await deps.repo.deleteSessionByTokenHash(tokenHash);
    },

    async requestPasswordReset(input) {
      const email = input.email.trim().toLowerCase();
      const user = await deps.repo.getUserByEmail(email);
      // Nie ujawniamy, czy konto istnieje — zawsze ok=true, mail wysyłamy
      // tylko gdy konto istnieje i jest aktywne (pending konto nie ma hasła
      // do resetu — niech najpierw aktywuje).
      if (!user || user.status !== "active") return { ok: true };

      const rawToken = await issueToken({
        userId: user.id,
        kind: "password_reset",
        ttlMs: resetTtlMs,
      });
      // Format zgodny z frontową ścieżką /reset-hasla (token w query).
      const link = `${deps.frontendOrigin}/reset-hasla?token=${encodeURIComponent(rawToken)}`;
      await deps.mail.send(buildResetEmail(user.email, link));
      return { ok: true };
    },

    async resetPassword(input) {
      const tokenHash = await hashSessionToken(input.token);
      const consumed = await deps.repo.consumeToken(tokenHash, "password_reset", now());
      if (!consumed) return { ok: false, reason: "invalid-token" };

      const passwordHash = await hashPassword(input.password, hashOpts);
      await deps.repo.setUserPassword(consumed.userId, passwordHash);
      return { ok: true };
    },

    async currentUserBySessionToken(sessionToken) {
      if (!sessionToken) return null;
      const tokenHash = await hashSessionToken(sessionToken);
      const session = await deps.repo.getSessionByTokenHash(tokenHash);
      if (!session) return null;
      if (new Date(session.expiresAt).getTime() <= now().getTime()) {
        // Nieświeża sesja — sprzątamy przy okazji.
        await deps.repo.deleteSessionByTokenHash(tokenHash);
        return null;
      }
      const user = await deps.repo.getUserById(session.userId);
      return user ? toPublicUser(user) : null;
    },
  };
}
