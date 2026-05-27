import { describe, it, expect } from "vitest";
import { generateViewSlug } from "./credentials";

describe("generateViewSlug", () => {
  it("ma długość 12 i URL-safe znaki", () => {
    const s = generateViewSlug();
    expect(s).toHaveLength(12);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("dwa wywołania zwracają różne wartości", () => {
    expect(generateViewSlug()).not.toBe(generateViewSlug());
  });

  it("100 wywołań nie generuje duplikatów (sanity)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(generateViewSlug());
    expect(set.size).toBe(100);
  });
});
