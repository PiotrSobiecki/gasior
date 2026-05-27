import { Hono } from "hono";
import type { Context } from "hono";
import type { JournalService } from "./service";
import type { AuthVariables } from "../auth/middleware";

// Routes dziennika montowane pod /api/batches/:viewSlug/journal.
// POST przyjmuje multipart/form-data (entryAt, body, opcjonalne photo).
// Po przejściu na konta: POST wymaga zalogowanego właściciela (lub isDemo).
export function createJournalApp(
  getDeps: (c: Context) => {
    service: JournalService;
    viewSlug: string;
  },
) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/", async (c) => {
    const { service, viewSlug } = getDeps(c);
    const list = await service.list(viewSlug);
    if (list === null)
      return c.json({ error: "Nie znaleziono nastawu" }, 404);
    return c.json(list);
  });

  app.post("/", async (c) => {
    const { service, viewSlug } = getDeps(c);
    const user = c.get("currentUser");

    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return c.json({ error: "Niepoprawny multipart/form-data" }, 400);
    }

    const entryAtRaw = form.get("entryAt");
    const bodyRaw = form.get("body");
    if (typeof entryAtRaw !== "string" || typeof bodyRaw !== "string") {
      return c.json({ error: "Wymagane pola: entryAt, body" }, 400);
    }
    const ts = Date.parse(entryAtRaw);
    if (Number.isNaN(ts)) {
      return c.json({ error: "Niepoprawna data wpisu" }, 400);
    }

    const photoRaw = form.get("photo");
    let photo: { bytes: Uint8Array; contentType: string } | null = null;
    // FormData.get() w runtime workerów zwraca string | Blob (File rozszerza
    // Blob). Sprawdzamy duck-type zamiast `instanceof File`, bo typy Workers
    // i lib.dom różnią się definicją File.
    if (
      photoRaw &&
      typeof photoRaw !== "string" &&
      typeof (photoRaw as Blob).arrayBuffer === "function" &&
      (photoRaw as Blob).size > 0
    ) {
      const blob = photoRaw as Blob;
      const buf = await blob.arrayBuffer();
      photo = {
        bytes: new Uint8Array(buf),
        contentType: blob.type,
      };
    }

    const result = await service.addEntry(viewSlug, user?.id, {
      entryAt: new Date(ts).toISOString(),
      body: bodyRaw,
      photo,
    });

    if (result.ok) return c.json(result.entry, 201);
    if (result.reason === "not-found") {
      return c.json({ error: "Nie znaleziono nastawu" }, 404);
    }
    if (result.reason === "auth-required") {
      return c.json({ error: "Wymagane zalogowanie" }, 401);
    }
    if (result.reason === "forbidden") {
      return c.json({ error: "Nie jesteś właścicielem tego nastawu" }, 403);
    }
    return c.json(
      { error: result.message ?? "Niepoprawne dane wpisu" },
      400,
    );
  });

  return app;
}
