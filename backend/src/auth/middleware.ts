import type { Context, MiddlewareHandler } from "hono";
import { parseSessionCookie } from "../lib/sessions";
import type { AuthService } from "./service";
import type { UserPublic } from "./repo";

// Klucz w kontekście Hono, pod którym leży aktualnie zalogowany user.
// Korzystamy z `c.set/c.get` z typowanym `Variables`, żeby uniknąć "any".
export type AuthVariables = {
  currentUser: UserPublic | null;
};

// Helper typu: middleware nie wymaga konkretnego Bindings — może być
// montowane zarówno w sub-aplikacji (bez Bindings), jak i w głównej apce
// (z Bindings). `MiddlewareHandler<any>` jest celowy, bo Hono i tak waliduje
// `Variables` przy `c.set`/`c.get` w docelowych route'ach.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAuthMiddleware = MiddlewareHandler<any>;

// Podmieniamy serwis przez getter (analogicznie do batchów) — pozwala robić
// per-request init z env bindings.
export function createAuthContextMiddleware(
  getService: (c: Context) => AuthService,
): AnyAuthMiddleware {
  return async (c, next) => {
    const cookieHeader = c.req.header("cookie") ?? null;
    const token = parseSessionCookie(cookieHeader);
    const user = token
      ? await getService(c).currentUserBySessionToken(token)
      : null;
    c.set("currentUser", user);
    await next();
  };
}

// Hard-gate dla endpointów wymagających zalogowania. Używać po
// createAuthContextMiddleware().
export function requireUser(): AnyAuthMiddleware {
  return async (c, next) => {
    const user = c.get("currentUser") as UserPublic | null;
    if (!user) {
      return c.json({ error: "Wymagane zalogowanie" }, 401);
    }
    return next();
  };
}
