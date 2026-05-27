import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { MeasurementService } from "./service";
import { createMeasurementBodySchema } from "./validation";
import type { AuthVariables } from "../auth/middleware";

// Routes pomiarów montowane pod /api/batches/:viewSlug/measurements.
// Caller dostaje funkcję która z kontekstu wyciąga `service` oraz `viewSlug`
// z rodzica (Hono nie współdzieli parametrów ścieżki przez router.route).
//
// Po przejściu na konta: GET zostaje publiczny; POST wymaga zalogowanego
// właściciela nastawu (lub `isDemo=true`). Autoryzacja przez cookie sesji,
// nie X-Edit-Code.
export function createMeasurementsApp(
  getDeps: (c: Context) => {
    service: MeasurementService;
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

  app.post(
    "/",
    zValidator("json", createMeasurementBodySchema),
    async (c) => {
      const { service, viewSlug } = getDeps(c);
      const user = c.get("currentUser");
      const body = c.req.valid("json");
      const result = await service.addMeasurement(viewSlug, user?.id, {
        measuredAt: body.measuredAt,
        brix: body.brix ?? null,
        sg: body.sg ?? null,
        temperatureC: body.temperatureC ?? null,
        note: body.note ?? null,
      });

      if (result.ok) return c.json(result.measurement, 201);
      if (result.reason === "not-found") {
        return c.json({ error: "Nie znaleziono nastawu" }, 404);
      }
      if (result.reason === "invalid") {
        return c.json(
          { error: "Wymagany przynajmniej jeden z odczytów: brix lub sg" },
          400,
        );
      }
      if (result.reason === "auth-required") {
        return c.json({ error: "Wymagane zalogowanie" }, 401);
      }
      return c.json({ error: "Nie jesteś właścicielem tego nastawu" }, 403);
    },
  );

  return app;
}
