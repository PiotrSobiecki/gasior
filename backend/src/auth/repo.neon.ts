import { and, eq, isNull, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, userTokens, users } from "../db/schema";
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

type UserRow = typeof users.$inferSelect;
type TokenRow = typeof userTokens.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  displayName: row.displayName,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

const toUserToken = (row: TokenRow): UserToken => ({
  id: row.id,
  userId: row.userId,
  kind: row.kind,
  tokenHash: row.tokenHash,
  expiresAt: row.expiresAt.toISOString(),
  consumedAt: row.consumedAt ? row.consumedAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
});

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.userId,
  tokenHash: row.tokenHash,
  expiresAt: row.expiresAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
});

// Produkcyjna implementacja AuthRepo na Neon (Postgres) przez Drizzle.
// E-mail zawsze lowercased w warstwie serwisu, więc tu możemy szukać po
// dokładnym dopasowaniu — niemniej dla pewności normalizujemy też lookup
// (chroni przed wywołaniem repo "z palca" w testach end-to-end).
export function createNeonAuthRepo(databaseUrl: string): AuthRepo {
  const db = getDb(databaseUrl);
  return {
    async createUser(input: UserCreateInput) {
      const [row] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          displayName: input.displayName,
        })
        .returning();
      return toUser(row);
    },

    async getUserById(id: string) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row ? toUser(row) : null;
    },

    async getUserByEmail(email: string) {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));
      return row ? toUser(row) : null;
    },

    async setUserPassword(userId: string, passwordHash: string) {
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    },

    async setUserStatus(userId: string, status: UserStatus) {
      await db.update(users).set({ status }).where(eq(users.id, userId));
    },

    async createToken(input: UserTokenCreateInput) {
      const [row] = await db
        .insert(userTokens)
        .values({
          userId: input.userId,
          kind: input.kind,
          tokenHash: input.tokenHash,
          expiresAt: new Date(input.expiresAt),
        })
        .returning();
      return toUserToken(row);
    },

    async consumeToken(tokenHash: string, kind: UserTokenKind, now: Date) {
      // Atomiczne "consume": UPDATE … WHERE consumed_at IS NULL AND expires_at > now
      // AND kind = ? — gwarantuje, że tylko jedna konsumpcja przejdzie nawet
      // przy równoczesnych requestach. RETURNING * = nie potrzebujemy drugiego
      // SELECT-a.
      const [row] = await db
        .update(userTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(userTokens.tokenHash, tokenHash),
            eq(userTokens.kind, kind),
            isNull(userTokens.consumedAt),
            gt(userTokens.expiresAt, now),
          ),
        )
        .returning();
      return row ? toUserToken(row) : null;
    },

    async createSession(input: SessionCreateInput) {
      const [row] = await db
        .insert(sessions)
        .values({
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: new Date(input.expiresAt),
        })
        .returning();
      return toSession(row);
    },

    async getSessionByTokenHash(tokenHash: string) {
      const [row] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, tokenHash));
      return row ? toSession(row) : null;
    },

    async deleteSessionByTokenHash(tokenHash: string) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
  };
}

// Pomocnik do okresowego sprzątania (np. cron / on-startup). Nie jest częścią
// AuthRepo, bo nie chcemy go wystawiać na drogę gorącą — wywołujemy ręcznie.
export async function purgeExpiredAuthRecords(databaseUrl: string): Promise<void> {
  const db = getDb(databaseUrl);
  await db.execute(sql`DELETE FROM sessions WHERE expires_at <= NOW()`);
  await db.execute(
    sql`DELETE FROM user_tokens WHERE expires_at <= NOW() OR consumed_at IS NOT NULL`,
  );
}
