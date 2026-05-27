import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { BatchService } from "./service";
import {
  createBatchBodySchema,
  patchBatchBodySchema,
} from "./validation";
import type { AuthVariables } from "../auth/middleware";
import { requireUser } from "../auth/middleware";

// Tracker nastawów — model "konto + sesja".
// Tworzenie i edycja wymagają zalogowania (sesja w cookie, czytana przez
// auth middleware przed route'm). Widoczność (GET /:viewSlug) zostaje
// publiczna — link do nastawu można udostępniać.
export function createBatchesApp(getService: (c: Context) => BatchService) {
  const app = new Hono<{ Variables: AuthVariables }>();

  // GET /api/batches?mine=true → lista MOICH nastawów (wymaga sesji).
  app.get("/", requireUser(), async (c) => {
    const mine = c.req.query("mine");
    const user = c.get("currentUser");
    if (!user) {
      // Theoretycznie nieosiągalne przez requireUser, ale TypeScript tego nie wie.
      return c.json({ error: "Wymagane zalogowanie" }, 401);
    }
    if (mine !== "true") {
      // Na razie zwracamy tylko własne — globalna lista nie ma sensu w MVP.
      return c.json({ batches: [] });
    }
    const batches = await getService(c).listForUser(user.id);
    return c.json({ batches });
  });

  app.post(
    "/",
    requireUser(),
    zValidator("json", createBatchBodySchema),
    async (c) => {
      const user = c.get("currentUser")!;
      const body = c.req.valid("json");
      const result = await getService(c).createBatch({
        userId: user.id,
        name: body.name,
        startDate: body.startDate,
        recipeId: body.recipeId ?? null,
        instructionSteps: body.instructionSteps,
      });
      if (!result.ok) {
        if (result.reason === "recipe-not-found") {
          return c.json({ error: "Nie znaleziono receptury" }, 400);
        }
        return c.json({ error: "Niepoprawne dane nastawu" }, 400);
      }
      // Zwracamy publiczny widok — bez editCode. Frontend zalogowanego usera
      // dostaje wystarczająco dużo, by od razu zredirectować na /nastaw/:viewSlug.
      return c.json({ batch: result.batch }, 201);
    },
  );

  app.get("/:viewSlug", async (c) => {
    const viewSlug = c.req.param("viewSlug");
    const batch = await getService(c).getPublic(viewSlug);
    if (!batch) return c.json({ error: "Nie znaleziono nastawu" }, 404);
    return c.json(batch);
  });

  app.patch(
    "/:viewSlug",
    zValidator("json", patchBatchBodySchema),
    async (c) => {
      const viewSlug = c.req.param("viewSlug");
      const user = c.get("currentUser");
      const patch = c.req.valid("json");
      const result = await getService(c).updateBatch(viewSlug, user?.id, patch);

      if (result.ok) return c.json(result.batch);
      if (result.reason === "not-found") {
        return c.json({ error: "Nie znaleziono nastawu" }, 404);
      }
      if (result.reason === "auth-required") {
        return c.json({ error: "Wymagane zalogowanie" }, 401);
      }
      return c.json({ error: "Nie jesteś właścicielem tego nastawu" }, 403);
    },
  );

  return app;
}
