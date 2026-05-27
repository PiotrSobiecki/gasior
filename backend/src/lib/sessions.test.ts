import { describe, it, expect } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
  buildSessionCookie,
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "./sessions";

describe("session tokens", () => {
  it("generates 32+ char URL-safe tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    // URL-safe: base64url ([A-Za-z0-9_-]), bez '=' / '+' / '/'.
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes deterministically (SHA-256 of token)", async () => {
    const t = "deadbeef";
    const h1 = await hashSessionToken(t);
    const h2 = await hashSessionToken(t);
    expect(h1).toBe(h2);
    // SHA-256 = 64 hex
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", async () => {
    const h1 = await hashSessionToken("aaaa");
    const h2 = await hashSessionToken("bbbb");
    expect(h1).not.toBe(h2);
  });
});

describe("session cookie helpers", () => {
  it("uses HttpOnly + SameSite=Lax + Path=/ + Max-Age", () => {
    const cookie = buildSessionCookie("opaque-token-123", {
      maxAgeSeconds: 3600,
      secure: false,
    });
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=opaque-token-123;`));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=3600/);
    expect(cookie).not.toMatch(/Secure/);
  });

  it("appends Secure when secure=true", () => {
    const cookie = buildSessionCookie("t", { maxAgeSeconds: 60, secure: true });
    expect(cookie).toMatch(/Secure/);
  });

  it("builds a delete-cookie when max-age=0", () => {
    const cookie = buildSessionCookie("", { maxAgeSeconds: 0, secure: false });
    expect(cookie).toMatch(/Max-Age=0/);
  });

  it("parses session token from a Cookie header (single cookie)", () => {
    expect(parseSessionCookie(`${SESSION_COOKIE_NAME}=abc123`)).toBe("abc123");
  });

  it("parses session token from a Cookie header with multiple cookies", () => {
    const header = `foo=bar; ${SESSION_COOKIE_NAME}=xyz; baz=qux`;
    expect(parseSessionCookie(header)).toBe("xyz");
  });

  it("returns null when cookie header is missing or empty", () => {
    expect(parseSessionCookie(null)).toBeNull();
    expect(parseSessionCookie("")).toBeNull();
    expect(parseSessionCookie("other=value")).toBeNull();
  });
});
