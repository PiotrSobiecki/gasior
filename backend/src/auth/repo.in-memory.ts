import type {
  AuthRepo,
  Session,
  SessionCreateInput,
  User,
  UserCreateInput,
  UserStatus,
  UserToken,
  UserTokenCreateInput,
  UserTokenKind,
} from "./repo";

// In-memory implementacja AuthRepo — używana w testach unit, na potrzeby
// `wrangler dev` bez prawdziwego Neona też zadziała, ale stan przepada przy
// restarcie Workera (każdy worker-instance ma własną pamięć).

export function createInMemoryAuthRepo(): AuthRepo {
  const users = new Map<string, User>();        // by id
  const tokens = new Map<string, UserToken>();  // by tokenHash (unique)
  const sessions = new Map<string, Session>();  // by tokenHash (unique)

  function findUserByEmail(email: string): User | null {
    const lc = email.toLowerCase();
    for (const u of users.values()) {
      if (u.email === lc) return u;
    }
    return null;
  }

  return {
    async createUser(input: UserCreateInput) {
      const email = input.email.toLowerCase();
      if (findUserByEmail(email)) {
        throw new Error(`duplicate email: ${email} already exists`);
      }
      const u: User = {
        id: crypto.randomUUID(),
        email,
        passwordHash: null,
        displayName: input.displayName,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      users.set(u.id, u);
      return u;
    },

    async getUserById(id: string) {
      return users.get(id) ?? null;
    },

    async getUserByEmail(email: string) {
      return findUserByEmail(email);
    },

    async setUserPassword(userId: string, passwordHash: string) {
      const u = users.get(userId);
      if (!u) return;
      users.set(userId, { ...u, passwordHash });
    },

    async setUserStatus(userId: string, status: UserStatus) {
      const u = users.get(userId);
      if (!u) return;
      users.set(userId, { ...u, status });
    },

    async createToken(input: UserTokenCreateInput) {
      const t: UserToken = {
        id: crypto.randomUUID(),
        userId: input.userId,
        kind: input.kind,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        consumedAt: null,
        createdAt: new Date().toISOString(),
      };
      tokens.set(t.tokenHash, t);
      return t;
    },

    async consumeToken(tokenHash: string, kind: UserTokenKind, now: Date) {
      const t = tokens.get(tokenHash);
      if (!t) return null;
      if (t.kind !== kind) return null;
      if (t.consumedAt !== null) return null;
      if (new Date(t.expiresAt).getTime() <= now.getTime()) return null;
      const consumed: UserToken = { ...t, consumedAt: now.toISOString() };
      tokens.set(tokenHash, consumed);
      return consumed;
    },

    async createSession(input: SessionCreateInput) {
      const s: Session = {
        id: crypto.randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: new Date().toISOString(),
      };
      sessions.set(s.tokenHash, s);
      return s;
    },

    async getSessionByTokenHash(tokenHash: string) {
      return sessions.get(tokenHash) ?? null;
    },

    async deleteSessionByTokenHash(tokenHash: string) {
      sessions.delete(tokenHash);
    },
  };
}
