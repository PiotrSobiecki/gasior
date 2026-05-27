import { Hono } from "hono";
import type { Context } from "hono";
import type { ObjectStorage } from "./storage";

// Worker serwuje zdjęcia z bucketu pod /api/photos/<klucz>.
// Klucze są dłuższe niż jeden segment (np. "batches/<uuid>/photos/<plik>"),
// więc używamy wildcard `*` i sami sklejamy.
export function createPhotosApp(
  getDeps: (c: Context) => { storage: ObjectStorage },
) {
  const app = new Hono();

  app.get("/*", async (c) => {
    const { storage } = getDeps(c);
    // c.req.routePath = "/api/photos/*"; c.req.path = pełna ścieżka.
    // Wycinamy prefix routePath (bez "*") z path → reszta to klucz.
    const prefix = c.req.routePath.replace(/\*$/, "");
    const key = c.req.path.startsWith(prefix)
      ? c.req.path.slice(prefix.length)
      : "";
    if (key.length === 0) {
      return c.json({ error: "Brak klucza" }, 400);
    }

    const obj = await storage.get(key);
    if (!obj) return c.json({ error: "Nie znaleziono pliku" }, 404);

    return new Response(obj.body, {
      status: 200,
      headers: {
        "content-type": obj.contentType,
        // Klucze są zawsze nowe (uuid), więc immutable cache działa.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  });

  return app;
}
