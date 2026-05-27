import { describe, it, expect } from "vitest";
import { createInMemoryMeasurementRepo } from "./repo.in-memory";

describe("createInMemoryMeasurementRepo", () => {
  it("create() generuje id i createdAt, zachowuje pola wejścia", async () => {
    const repo = createInMemoryMeasurementRepo();
    const created = await repo.create({
      batchId: "batch-1",
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: 22,
      note: "start fermentacji",
    });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.brix).toBe(12);
    expect(created.sg).toBeNull();
    expect(created.note).toBe("start fermentacji");
  });

  it("listByBatchId() zwraca pomiary danego nastawu w kolejności chronologicznej", async () => {
    const repo = createInMemoryMeasurementRepo();
    // wstawiamy w odwrotnej kolejności
    await repo.create({
      batchId: "b1",
      measuredAt: "2026-06-10T10:00:00.000Z",
      brix: null,
      sg: 1.005,
      temperatureC: null,
      note: null,
    });
    await repo.create({
      batchId: "b1",
      measuredAt: "2026-05-20T08:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });
    await repo.create({
      batchId: "b1",
      measuredAt: "2026-05-30T09:00:00.000Z",
      brix: 6,
      sg: null,
      temperatureC: null,
      note: null,
    });

    const list = await repo.listByBatchId("b1");
    expect(list.map((m) => m.measuredAt)).toEqual([
      "2026-05-20T08:00:00.000Z",
      "2026-05-30T09:00:00.000Z",
      "2026-06-10T10:00:00.000Z",
    ]);
  });

  it("listByBatchId() nie miesza pomiarów różnych nastawów", async () => {
    const repo = createInMemoryMeasurementRepo();
    await repo.create({
      batchId: "a",
      measuredAt: "2026-05-20T08:00:00.000Z",
      brix: 10,
      sg: null,
      temperatureC: null,
      note: null,
    });
    await repo.create({
      batchId: "b",
      measuredAt: "2026-05-21T08:00:00.000Z",
      brix: 11,
      sg: null,
      temperatureC: null,
      note: null,
    });

    expect((await repo.listByBatchId("a")).length).toBe(1);
    expect((await repo.listByBatchId("b")).length).toBe(1);
    expect((await repo.listByBatchId("brak")).length).toBe(0);
  });
});
