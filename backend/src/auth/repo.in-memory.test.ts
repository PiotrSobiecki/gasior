import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryAuthRepo } from "./repo.in-memory";
import type { AuthRepo } from "./repo";

describe("InMemoryAuthRepo", () => {
  let repo: AuthRepo;
  const NOW = new Date("2026-05-26T18:00:00Z");
  const HOUR = 60 * 60 * 1000;
  const TOMORROW = new Date(NOW.getTime() + 24 * HOUR);

  beforeEach(() => {
    repo = createInMemoryAuthRepo();
  });

  describe("users", () => {
    it("creates a user with status=pending and null password", async () => {
      const u = await repo.createUser({
        email: "ada@example.com",
        displayName: "Ada",
      });
      expect(u.email).toBe("ada@example.com");
      expect(u.status).toBe("pending");
      expect(u.passwordHash).toBeNull();
      expect(u.id).toMatch(/[0-9a-f-]{36}/);
    });

    it("getUserByEmail is case-insensitive (we already store lowercase, but tolerate input)", async () => {
      await repo.createUser({ email: "ada@example.com", displayName: null });
      expect(await repo.getUserByEmail("ADA@Example.com")).not.toBeNull();
      expect(await repo.getUserByEmail("nope@example.com")).toBeNull();
    });

    it("setUserPassword stores the hash, setUserStatus flips status", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      await repo.setUserPassword(u.id, "pbkdf2-sha256$...");
      await repo.setUserStatus(u.id, "active");
      const got = await repo.getUserById(u.id);
      expect(got?.passwordHash).toBe("pbkdf2-sha256$...");
      expect(got?.status).toBe("active");
    });

    it("createUser throws on duplicate email (unique constraint)", async () => {
      await repo.createUser({ email: "dup@example.com", displayName: null });
      await expect(
        repo.createUser({ email: "dup@example.com", displayName: null }),
      ).rejects.toThrow(/duplicate|already|exists|unique/i);
    });
  });

  describe("user_tokens", () => {
    it("createToken then consumeToken returns the same token once, then null", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      const created = await repo.createToken({
        userId: u.id,
        kind: "activation",
        tokenHash: "hash1",
        expiresAt: TOMORROW.toISOString(),
      });
      expect(created.userId).toBe(u.id);

      const first = await repo.consumeToken("hash1", "activation", NOW);
      expect(first?.id).toBe(created.id);

      const second = await repo.consumeToken("hash1", "activation", NOW);
      expect(second).toBeNull();
    });

    it("consumeToken rejects wrong kind", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      await repo.createToken({
        userId: u.id,
        kind: "activation",
        tokenHash: "h",
        expiresAt: TOMORROW.toISOString(),
      });
      expect(await repo.consumeToken("h", "password_reset", NOW)).toBeNull();
    });

    it("consumeToken rejects expired tokens", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      const past = new Date(NOW.getTime() - HOUR).toISOString();
      await repo.createToken({
        userId: u.id,
        kind: "activation",
        tokenHash: "h",
        expiresAt: past,
      });
      expect(await repo.consumeToken("h", "activation", NOW)).toBeNull();
    });
  });

  describe("sessions", () => {
    it("createSession then getSessionByTokenHash roundtrips", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      const s = await repo.createSession({
        userId: u.id,
        tokenHash: "stoken",
        expiresAt: TOMORROW.toISOString(),
      });
      const got = await repo.getSessionByTokenHash("stoken");
      expect(got?.id).toBe(s.id);
      expect(got?.userId).toBe(u.id);
    });

    it("deleteSessionByTokenHash removes the session", async () => {
      const u = await repo.createUser({ email: "a@b", displayName: null });
      await repo.createSession({
        userId: u.id,
        tokenHash: "stoken",
        expiresAt: TOMORROW.toISOString(),
      });
      await repo.deleteSessionByTokenHash("stoken");
      expect(await repo.getSessionByTokenHash("stoken")).toBeNull();
    });
  });
});
