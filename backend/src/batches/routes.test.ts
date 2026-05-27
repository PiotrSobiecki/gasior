import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { createBatchesApp } from "./routes";
import { createInMemoryBatchRepo } from "./repo.in-memory";
import { createBatchService, type BatchServiceDeps } from "./service";
import type { BatchRepo } from "./repo";
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

// Buduje aplikację z fałszywym "currentUser" wstrzykniętym przez middleware.
// Każdy request musi mieć user=ALICE/BOB/null — niezależnie od cookies.
function makeApp(
  user: UserPublic | null,
  overrides: Partial<BatchServiceDeps> = {},
) {
  const repo: BatchRepo = overrides.repo ?? createInMemoryBatchRepo();
  const deps: BatchServiceDeps = {
    repo,
    generateViewSlug: () => "slugABCDEF12",
    ...overrides,
  };
  const service = createBatchService(deps);

  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("*", async (c, next) => {
    c.set("currentUser", user);
    await next();
  });
  app.route("/", createBatchesApp(() => service));
  return { app, repo, service };
}

describe("POST /api/batches (wymaga zalogowania)", () => {
  it("201 dla zalogowanego — zwraca batch z userId; bez editCode", async () => {
    const { app } = makeApp(ALICE);

    const res = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Wino z aronii 2026",
        startDate: "2026-05-20",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      batch: { viewSlug: string; name: string; userId: string; stage: string };
    };
    expect(body.batch.userId).toBe(ALICE.id);
    expect(body.batch.viewSlug).toBe("slugABCDEF12");
    expect(body.batch.name).toBe("Wino z aronii 2026");
    expect(body.batch.stage).toBe("fermentacja-burzliwa");
    // editCode po przejściu na konta zniknął całkowicie.
    expect("editCode" in body).toBe(false);
  });

  it("401 dla niezalogowanego", async () => {
    const { app, repo } = makeApp(null);
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X", startDate: "2026-01-01" }),
    });
    expect(res.status).toBe(401);
    expect(await repo.getByViewSlug("slugABCDEF12")).toBeNull();
  });

  it("odpowiedź NIE zawiera editCode ani editCodeHash", async () => {
    const { app } = makeApp(ALICE);
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X", startDate: "2026-01-01" }),
    });
    const raw = await res.text();
    expect(raw).not.toContain("editCode");
    expect(raw).not.toContain("editCodeHash");
  });

  it("400 dla brakującej nazwy (po zalogowaniu)", async () => {
    const { app } = makeApp(ALICE);
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "2026-01-01" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 dla niepoprawnej daty startu (po zalogowaniu)", async () => {
    const { app } = makeApp(ALICE);
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X", startDate: "byle-co" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/batches?mine=true", () => {
  it("zwraca listę nastawów zalogowanego usera", async () => {
    const repo = createInMemoryBatchRepo();
    let i = 0;
    const { app } = makeApp(ALICE, {
      repo,
      generateViewSlug: () => `s${i++}`,
    });

    // Alice ma 2, Bob ma 1.
    await repo.create({
      viewSlug: "alice-1",
      userId: ALICE.id,
      name: "A1",
      stage: "fermentacja-burzliwa",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await repo.create({
      viewSlug: "bob-1",
      userId: BOB.id,
      name: "B1",
      stage: "fermentacja-burzliwa",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await repo.create({
      viewSlug: "alice-2",
      userId: ALICE.id,
      name: "A2",
      stage: "fermentacja-burzliwa",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const res = await app.request("/?mine=true");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { batches: { name: string }[] };
    expect(body.batches.map((b) => b.name).sort()).toEqual(["A1", "A2"]);
  });

  it("401 bez zalogowania", async () => {
    const { app } = makeApp(null);
    const res = await app.request("/?mine=true");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/batches/:viewSlug (publiczny)", () => {
  it("zwraca 200 + BatchPublic bez wymogu zalogowania", async () => {
    const repo = createInMemoryBatchRepo();
    await repo.create({
      viewSlug: "slugABCDEF12",
      userId: ALICE.id,
      name: "X",
      stage: "fermentacja-burzliwa",
      startDate: "2026-01-01",
      recipeId: null,
    });
    const { app } = makeApp(null, { repo });

    const res = await app.request("/slugABCDEF12");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.viewSlug).toBe("slugABCDEF12");
    expect(body.userId).toBe(ALICE.id);
    expect("editCodeHash" in body).toBe(false);
  });

  it("zwraca 404 dla nieistniejącego slug", async () => {
    const { app } = makeApp(null);
    const res = await app.request("/nieistnieje");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/batches/:viewSlug", () => {
  async function setup(actor: UserPublic | null) {
    const repo = createInMemoryBatchRepo();
    await repo.create({
      viewSlug: "slugABCDEF12",
      userId: ALICE.id,
      name: "X",
      stage: "fermentacja-burzliwa",
      startDate: "2026-01-01",
      recipeId: null,
    });
    return makeApp(actor, { repo });
  }

  it("401 dla niezalogowanego", async () => {
    const { app, repo } = await setup(null);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(401);
    const stored = await repo.getByViewSlug("slugABCDEF12");
    expect(stored?.stage).toBe("fermentacja-burzliwa");
  });

  it("403 gdy edytuje inny user; dane nietknięte", async () => {
    const { app, repo } = await setup(BOB);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(403);
    const stored = await repo.getByViewSlug("slugABCDEF12");
    expect(stored?.stage).toBe("fermentacja-burzliwa");
  });

  it("200 dla właściciela — zmienia stage", async () => {
    const { app } = await setup(ALICE);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stage: string };
    expect(body.stage).toBe("dojrzewanie");
  });

  it("200 dla właściciela — zmienia startDate", async () => {
    const { app } = await setup(ALICE);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "2026-06-15" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { startDate: string };
    expect(body.startDate).toBe("2026-06-15");
  });

  it("400 dla niepoprawnej wartości stage (właściciel)", async () => {
    const { app, repo } = await setup(ALICE);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "niepoprawny" }),
    });
    expect(res.status).toBe(400);
    const stored = await repo.getByViewSlug("slugABCDEF12");
    expect(stored?.stage).toBe("fermentacja-burzliwa");
  });

  it("404 dla nieistniejącego slug (właściciel czy nie — najpierw 404)", async () => {
    const { app } = await setup(ALICE);
    const res = await app.request("/nieistnieje", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(404);
  });

  it("ignoruje próbę edycji name", async () => {
    const { app, repo } = await setup(ALICE);
    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Nowa nazwa", stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(200);
    const stored = await repo.getByViewSlug("slugABCDEF12");
    expect(stored?.name).toBe("X");
    expect(stored?.stage).toBe("dojrzewanie");
  });

  it("isDemo=true: PATCH działa nawet bez sesji", async () => {
    const { app, repo } = await setup(null);
    await repo.setDemoByViewSlug("slugABCDEF12", true);

    const res = await app.request("/slugABCDEF12", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "dojrzewanie" }),
    });
    expect(res.status).toBe(200);
  });
});
