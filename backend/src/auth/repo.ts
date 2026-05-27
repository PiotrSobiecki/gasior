// Repo dla domeny auth: users, user_tokens, sessions.
//
// Typy są jawne (a nie generowane z drizzle.$inferSelect), żeby in-memory repo
// i Neon repo dostarczały dokładnie ten sam kształt — serwis i testy nie muszą
// rozróżniać implementacji.

export type UserStatus = "pending" | "active";
export type UserTokenKind = "activation" | "password_reset";

export type User = {
  id: string;
  email: string;          // zawsze lowercased (normalizacja w serwisie)
  passwordHash: string | null; // null dla "pending" (przed aktywacją)
  displayName: string | null;
  status: UserStatus;
  createdAt: string;      // ISO timestamp
};

// To, co zwracamy przez API — nigdy nie wycieka passwordHash.
export type UserPublic = Omit<User, "passwordHash">;

export function toPublicUser(u: User): UserPublic {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    status: u.status,
    createdAt: u.createdAt,
  };
}

export type UserCreateInput = {
  email: string;
  displayName: string | null;
};

export type UserToken = {
  id: string;
  userId: string;
  kind: UserTokenKind;
  tokenHash: string;
  expiresAt: string;      // ISO timestamp
  consumedAt: string | null;
  createdAt: string;
};

export type UserTokenCreateInput = {
  userId: string;
  kind: UserTokenKind;
  tokenHash: string;
  expiresAt: string;
};

export type Session = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type SessionCreateInput = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
};

export interface AuthRepo {
  // --- users ---
  createUser(input: UserCreateInput): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  // Bezpieczne, jawne mutacje (zamiast generic update) — zmniejsza ryzyko
  // przypadkowego nadpisania pól wrażliwych.
  setUserPassword(userId: string, passwordHash: string): Promise<void>;
  setUserStatus(userId: string, status: UserStatus): Promise<void>;

  // --- user_tokens ---
  createToken(input: UserTokenCreateInput): Promise<UserToken>;
  // Atomiczne "zużycie": tylko jeśli token istnieje, należy do `kind`,
  // nie był wcześniej skonsumowany i nie wygasł. Zwraca tokena (z user_id)
  // albo null. Robimy to w repo, żeby Neon mógł użyć transakcji/CTE
  // i wykluczyć wyścig dwóch jednoczesnych konsumpcji.
  consumeToken(tokenHash: string, kind: UserTokenKind, now: Date): Promise<UserToken | null>;

  // --- sessions ---
  createSession(input: SessionCreateInput): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
}
