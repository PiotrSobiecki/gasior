import { describe, it, expect } from "vitest";
import { createInMemoryJournalRepo } from "./repo.in-memory";

describe("createInMemoryJournalRepo", () => {
  it("create() generuje id i createdAt, zwraca wpis", async () => {
    const repo = createInMemoryJournalRepo();
    const e = await repo.create({
      batchId: "b1",
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "owoce pachną pięknie",
      photoKey: null,
      photoUrl: null,
    });

    expect(e.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(e.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(e.body).toBe("owoce pachną pięknie");
  });

  it("listByBatchId() zwraca wpisy chronologicznie", async () => {
    const repo = createInMemoryJournalRepo();
    await repo.create({
      batchId: "b1",
      entryAt: "2026-06-01T08:00:00.000Z",
      body: "klaruje się",
      photoKey: null,
      photoUrl: null,
    });
    await repo.create({
      batchId: "b1",
      entryAt: "2026-05-20T08:00:00.000Z",
      body: "start",
      photoKey: null,
      photoUrl: null,
    });

    const list = await repo.listByBatchId("b1");
    expect(list.map((m) => m.entryAt)).toEqual([
      "2026-05-20T08:00:00.000Z",
      "2026-06-01T08:00:00.000Z",
    ]);
  });

  it("listByBatchId() nie miesza wpisów różnych nastawów", async () => {
    const repo = createInMemoryJournalRepo();
    await repo.create({
      batchId: "a",
      entryAt: "2026-05-20T08:00:00.000Z",
      body: "a",
      photoKey: null,
      photoUrl: null,
    });
    await repo.create({
      batchId: "b",
      entryAt: "2026-05-21T08:00:00.000Z",
      body: "b",
      photoKey: null,
      photoUrl: null,
    });

    expect((await repo.listByBatchId("a")).length).toBe(1);
    expect((await repo.listByBatchId("brak")).length).toBe(0);
  });
});
