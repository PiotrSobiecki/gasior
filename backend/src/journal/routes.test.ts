import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { createJournalApp } from "./routes";
import { createInMemoryBatchRepo } from "../batches/repo.in-memory";
import { createInMemoryJournalRepo } from "./repo.in-memory";
import { createInMemoryObjectStorage } from "../storage/storage.in-memory";
import { createJournalService } from "./service";
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
  journalRepo = createInMemoryJournalRepo(),
  storage = createInMemoryObjectStorage(),
) {
  const service = createJournalService({
    batchRepo,
    journalRepo,
    storage,
    photoBaseUrl: "https://gasior.test/api/photos",
    generateKey: (bid, ext) => `batches/${bid}/photos/pic.${ext}`,
  });
  const parent = new Hono<{ Variables: AuthVariables }>();
  parent.use("*", async (c, next) => {
    c.set("currentUser", actor);
    await next();
  });
  const sub = createJournalApp((c: Context) => ({
    service,
    viewSlug: c.req.param("viewSlug")!,
  }));
  parent.route("/api/batches/:viewSlug/journal", sub);
  return { app: parent, batchRepo, journalRepo, storage };
}

function makeMultipart(fields: Record<string, string>, file?: {
  name: string;
  type: string;
  bytes: Uint8Array;
}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) {
    fd.append("photo", new Blob([file.bytes], { type: file.type }), file.name);
  }
  return fd;
}

describe("POST /api/batches/:viewSlug/journal", () => {
  it("201 dla właściciela z samym tekstem", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "klaruje się ładnie",
        }),
      },
    );
    expect(res.status).toBe(201);
    const e = (await res.json()) as { body: string; photoUrl: string | null };
    expect(e.body).toBe("klaruje się ładnie");
    expect(e.photoUrl).toBeNull();
  });

  it("201 ze zdjęciem JPEG — zwraca photoUrl i zapisuje obiekt", async () => {
    const { app, batchRepo, storage } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart(
          { entryAt: "2026-05-25T12:00:00.000Z", body: "fajna piana" },
          { name: "p.jpg", type: "image/jpeg", bytes: photo },
        ),
      },
    );
    expect(res.status).toBe(201);
    const e = (await res.json()) as {
      photoKey: string;
      photoUrl: string;
    };
    expect(e.photoKey).toMatch(/\.jpeg$/);
    expect(e.photoUrl).toBe(`https://gasior.test/api/photos/${e.photoKey}`);

    const stored = await storage.get(e.photoKey);
    expect(stored).not.toBeNull();
    expect(stored!.contentType).toBe("image/jpeg");
  });

  it("401 bez zalogowania", async () => {
    const { app, batchRepo } = makeApp(null);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "x",
        }),
      },
    );
    expect(res.status).toBe(401);
  });

  it("403 gdy zalogowany ale to nie jego nastaw", async () => {
    const { app, batchRepo, journalRepo } = makeApp(BOB);
    const batch = await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "x",
        }),
      },
    );
    expect(res.status).toBe(403);
    expect((await journalRepo.listByBatchId(batch.id)).length).toBe(0);
  });

  it("404 dla nieistniejącego slug", async () => {
    const { app } = makeApp(ALICE);
    const res = await app.request(
      "/api/batches/brak/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "x",
        }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("400 dla pustego body", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "   ",
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("400 dla niedozwolonego typu pliku", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart(
          { entryAt: "2026-05-25T12:00:00.000Z", body: "x" },
          { name: "a.gif", type: "image/gif", bytes: new Uint8Array([1, 2]) },
        ),
      },
    );
    expect(res.status).toBe(400);
    const err = (await res.json()) as { error: string };
    expect(err.error).toMatch(/typ|format/i);
  });

  it("400 dla niepoprawnej daty wpisu", async () => {
    const { app, batchRepo } = makeApp(ALICE);
    await setupBatch(batchRepo);

    const res = await app.request(
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "byle-co",
          body: "x",
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
      "/api/batches/slugABC123XY/journal",
      {
        method: "POST",
        body: makeMultipart({
          entryAt: "2026-05-25T12:00:00.000Z",
          body: "publiczny wpis",
        }),
      },
    );
    expect(res.status).toBe(201);
  });
});

describe("GET /api/batches/:viewSlug/journal", () => {
  it("200 z listą chronologiczną, publicznie", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const journalRepo = createInMemoryJournalRepo();
    const { app: appAlice } = makeApp(ALICE, batchRepo, journalRepo);
    const { app: appAnon } = makeApp(null, batchRepo, journalRepo);
    await setupBatch(batchRepo);

    await appAlice.request("/api/batches/slugABC123XY/journal", {
      method: "POST",
      body: makeMultipart({
        entryAt: "2026-06-10T08:00:00.000Z",
        body: "drugi",
      }),
    });
    await appAlice.request("/api/batches/slugABC123XY/journal", {
      method: "POST",
      body: makeMultipart({
        entryAt: "2026-05-20T08:00:00.000Z",
        body: "pierwszy",
      }),
    });

    const res = await appAnon.request("/api/batches/slugABC123XY/journal");
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ body: string }>;
    expect(list.map((e) => e.body)).toEqual(["pierwszy", "drugi"]);
  });

  it("404 dla nieznanego slug", async () => {
    const { app } = makeApp(null);
    const res = await app.request("/api/batches/brak/journal");
    expect(res.status).toBe(404);
  });
});
