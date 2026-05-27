// Tokeny sesji + ciasteczko sesyjne.
//
// Model: opaque token (32 losowe bajty, base64url) → przeglądarka trzyma go w
// HttpOnly cookie. W DB zapisujemy tylko SHA-256 z tokenu, więc wyciek bazy
// nie daje atakującemu możliwości zalogowania się. Logout / wygaśnięcie =
// usunięcie rekordu w `sessions`.

export const SESSION_COOKIE_NAME = "gasior_session";
const TOKEN_BYTES = 32;

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function generateSessionToken(): string {
  return bytesToBase64Url(getRandomBytes(TOKEN_BYTES));
}

export async function hashSessionToken(token: string): Promise<string> {
  // SHA-256 wystarczy: token ma 256 bitów entropii, więc nie potrzeba PBKDF2.
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

export interface CookieOptions {
  // Sekunda zapadająca w przeszłość = wygaszenie cookie po stronie klienta.
  maxAgeSeconds: number;
  // Prod = true (HTTPS), dev = false (HTTP). SameSite=Lax wystarcza dla
  // tych samych site (np. localhost:5173 → localhost:8787) i broni przed
  // klasycznym CSRF na endpointach POST.
  secure: boolean;
}

export function buildSessionCookie(token: string, opts: CookieOptions): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAgeSeconds}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  // Parsujemy ręcznie: standardowy Cookie header to "a=1; b=2; c=3".
  const pairs = cookieHeader.split(";");
  for (const raw of pairs) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.slice(0, eq).trim();
    if (name === SESSION_COOKIE_NAME) {
      const value = raw.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}
