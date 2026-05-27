import { describe, it, expect } from "vitest";
import { createInMemoryObjectStorage } from "./storage.in-memory";

const helloBytes = new TextEncoder().encode("hello");

describe("createInMemoryObjectStorage", () => {
  it("put + get round-trip zwraca te same bajty i contentType", async () => {
    const s = createInMemoryObjectStorage();
    await s.put("a/b.jpg", helloBytes, "image/jpeg");

    const got = await s.get("a/b.jpg");
    expect(got).not.toBeNull();
    expect(got!.contentType).toBe("image/jpeg");
    expect(new Uint8Array(got!.body)).toEqual(helloBytes);
  });

  it("get nieistniejącego klucza zwraca null", async () => {
    const s = createInMemoryObjectStorage();
    expect(await s.get("brak")).toBeNull();
  });

  it("put nadpisuje istniejący klucz", async () => {
    const s = createInMemoryObjectStorage();
    await s.put("k", new TextEncoder().encode("v1"), "text/plain");
    await s.put("k", new TextEncoder().encode("v2"), "text/plain");

    const got = await s.get("k");
    expect(new TextDecoder().decode(got!.body)).toBe("v2");
  });

  it("delete usuwa obiekt; kolejny get → null", async () => {
    const s = createInMemoryObjectStorage();
    await s.put("k", helloBytes, "image/png");
    await s.delete("k");
    expect(await s.get("k")).toBeNull();
  });

  it("delete nieistniejącego klucza nie rzuca", async () => {
    const s = createInMemoryObjectStorage();
    await expect(s.delete("brak")).resolves.toBeUndefined();
  });
});
