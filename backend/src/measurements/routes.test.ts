import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { createMeasurementsApp } from "./routes";
import { createInMemoryBatchRepo } from "../batches/repo.in-memory";
import { createInMemoryMeasurementRepo } from "./repo.in-memory";
import { createMeasurementService } from "./service";
import type { BatchRepo } from "../batches/repo";
import type { AuthVariables } from "../auth/middleware";
import type { UserPublic } from "../auth/repo";

const ALICE: UserPublic = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "alice@example.com",
  displayName: "Alice",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const BOB: UserPublic = {
  id: "22222222-2222-4222-a222-222222222222",
  email: "bob@example.com",
  displayName: "Bob",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function setupBatch(repo: BatchRepo, userId = ALICE.id) {
  return repo.create({
    viewSlug: "slugABC123XY",
    userId,
    name: "Wino",
    stage: "fermentacja-burzliwa",
    startDate: "2026-05-20",
    recipeId: null,
  });
}

function makeApp(
  actor: UserPublic | null,
  batchRepo = createInMemoryBatchRepo(),
  measurementRepo = createInMemoryMeasurementRepo(),
) {
  const service = createMeasurementService({ batchRepo, measurementRepo });
  const parent = new Hono<{ Variables: AuthVariables }>();
  parent.use("*", async (c, next) => {
    c.set("currentUser", actor);
    await next();
  });
  const subapp = createMeasurementsApp((c: Context) => ({
    service,
    viewSlug: c.req.param("viewSlug")!,
  }));
  parent.route("/api/batches/:viewSlug/measurements", subapp);
  return { app: parent, batchRepo, measurementRepo };
}

describe("POST /api/batches/:viewSlug/measurements", () => {
  it("201 dla właściciela", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "2026-05-25T12:00:00.000Z",
          brix: 12,
          temperatureC: 22,
          note: "start",
        }),
      },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { brix: number; note: string };
    expect(body.brix).toBe(12);
    expect(body.note).toBe("start");
  });

  it("401 bez zalogowania", async () => {
    const { app, batchRepo } = makeApp(null);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "2026-05-25T12:00:00.000Z",
          brix: 12,
        }),
      },
    );
    expect(res.status).toBe(401);
  });

  it("403 gdy zalogowany ale to nie jego nastaw", async () => {
    const { app, batchRepo, measurementRepo } = makeApp(BOB);
    const batch = await setupBatch(batchRepo); // owner = ALICE

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "2026-05-25T12:00:00.000Z",
          brix: 12,
        }),
      },
    );
    expect(res.status).toBe(403);
    expect((await measurementRepo.listByBatchId(batch.id)).length).toBe(0);
  });

  it("404 dla nieistniejącego slug", async () => {
    const { app } = makeApp(ALICE);

    const res = await app.request("/api/batches/brak/measurements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-05-25T12:00:00.000Z",
        brix: 12,
      }),
    });
    expect(res.status).toBe(404);
  });

  it("400 gdy brak brix i sg (samo pole tempC nie wystarcza)", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "2026-05-25T12:00:00.000Z",
          temperatureC: 22,
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("400 dla niepoprawnej daty pomiaru", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "byle-co",
          brix: 12,
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("isDemo=true: 201 nawet bez zalogowania", async () => {
    const { app, batchRepo } = makeApp(null);
    await setupBatch(batchRepo);
    await batchRepo.setDemoByViewSlug("slugABC123XY", true);

    const res = await app.request(
      "/api/batches/slugABC123XY/measurements",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          measuredAt: "2026-05-25T12:00:00.000Z",
          brix: 12,
        }),
      },
    );
    expect(res.status).toBe(201);
  });
});

describe("GET /api/batches/:viewSlug/measurements", () => {
  it("200 z listą chronologiczną (publicznie, bez sesji)", async () => {
    // Dodajemy 2 pomiary przez "Alice" (właścicielkę), współdzieląc obie repo
    // między dwiema aplikacjami (Alice i Anon), żeby zweryfikować że GET bez
    // sesji widzi to samo co GET zalogowanego.
    const batchRepo = createInMemoryBatchRepo();
    const measurementRepo = createInMemoryMeasurementRepo();
    const { app: appAlice } = makeApp(ALICE, batchRepo, measurementRepo);
    const { app: appAnon } = makeApp(null, batchRepo, measurementRepo);
    await setupBatch(batchRepo);

    await appAlice.request("/api/batches/slugABC123XY/measurements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-06-10T08:00:00.000Z",
        sg: 1.005,
      }),
    });
    await appAlice.request("/api/batches/slugABC123XY/measurements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-05-20T08:00:00.000Z",
        sg: 1.09,
      }),
    });

    const res = await appAnon.request(
      "/api/batches/slugABC123XY/measurements",
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ measuredAt: string; sg: number }>;
    expect(list.map((m) => m.measuredAt)).toEqual([
      "2026-05-20T08:00:00.000Z",
      "2026-06-10T08:00:00.000Z",
    ]);
  });

  it("404 dla nieistniejącego viewSlug", async () => {
    const { app } = makeApp(null);
    const res = await app.request("/api/batches/brak/measurements");
    expect(res.status).toBe(404);
  });
});
