import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

// Decyzje:
// - PBKDF2-SHA256 z Web Crypto (Workers/Node ≥18 wspierają natywnie).
// - Format hashu phc-podobny: pbkdf2-sha256$<iters>$<salt-b64>$<hash-b64>
//   — samodokumentujący się, pozwala podnieść iteracje bez migracji DB.
// - Iteracje per-call (możliwość obniżenia w testach przez opcjonalny override),
//   ale domyślnie zgodne z OWASP-iem (100k+).

describe("hashPassword + verifyPassword", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple", { iterations: 1000 });
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple", { iterations: 1000 });
    expect(await verifyPassword("Tr0ub4dor&3", hash)).toBe(false);
  });

  it("produces a different hash for the same password each call (salt is random)", async () => {
    const a = await hashPassword("hunter2", { iterations: 1000 });
    const b = await hashPassword("hunter2", { iterations: 1000 });
    expect(a).not.toBe(b);
    // …ale oba muszą poprawnie weryfikować ten sam plaintext.
    expect(await verifyPassword("hunter2", a)).toBe(true);
    expect(await verifyPassword("hunter2", b)).toBe(true);
  });

  it("uses a phc-style format with algorithm, iterations, salt and hash segments", async () => {
    const h = await hashPassword("x", { iterations: 1000 });
    // Postać: pbkdf2-sha256$<iter>$<salt-b64>$<hash-b64>
    const parts = h.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("pbkdf2-sha256");
    expect(Number(parts[1])).toBe(1000);
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[3].length).toBeGreaterThan(0);
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("anything", "not-a-real-hash")).toBe(false);
    expect(await verifyPassword("anything", "pbkdf2-sha256$nope")).toBe(false);
  });

  it("uses a sane iteration count by default (≥100k)", async () => {
    // Test wolny (≈100ms), ale to celowy kontrakt bezpieczeństwa: domyślne
    // iteracje nie mogą zjechać niezauważone — w przeciwnym razie hasła
    // pierwszorzędnie szybciej brute-force'ować.
    const h = await hashPassword("slow-default");
    const iter = Number(h.split("$")[1]);
    expect(iter).toBeGreaterThanOrEqual(100_000);
  });
});
