import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { createPhotosApp } from "./photoRoute";
import { createInMemoryObjectStorage } from "./storage.in-memory";

function makeApp(storage = createInMemoryObjectStorage()) {
  const parent = new Hono();
  const sub = createPhotosApp((_c: Context) => ({ storage }));
  parent.route("/api/photos", sub);
  return { app: parent, storage };
}

describe("GET /api/photos/:key+", () => {
  it("200 zwraca bajty + contentType", async () => {
    const { app, storage } = makeApp();
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);
    await storage.put("batches/abc/photos/p.jpeg", bytes, "image/jpeg");

    const res = await app.request("/api/photos/batches/abc/photos/p.jpeg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");

    const got = new Uint8Array(await res.arrayBuffer());
    expect(got).toEqual(bytes);
  });

  it("404 dla nieistniejącego klucza", async () => {
    const { app } = makeApp();
    const res = await app.request("/api/photos/nie/ma/takiego.jpg");
    expect(res.status).toBe(404);
  });

  it("ma cache-control immutable (długi cache, klucze są unikalne)", async () => {
    const { app, storage } = makeApp();
    await storage.put("k.png", new Uint8Array([1]), "image/png");

    const res = await app.request("/api/photos/k.png");
    expect(res.headers.get("cache-control")).toMatch(/max-age|immutable/);
  });
});
