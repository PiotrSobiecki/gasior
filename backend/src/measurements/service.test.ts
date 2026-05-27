import { describe, it, expect } from "vitest";
import { createInMemoryBatchRepo } from "../batches/repo.in-memory";
import { createInMemoryMeasurementRepo } from "./repo.in-memory";
import {
  createMeasurementService,
  type MeasurementServiceDeps,
} from "./service";
import type { BatchRepo } from "../batches/repo";

const ALICE = "11111111-1111-4111-a111-111111111111";
const BOB = "22222222-2222-4222-a222-222222222222";

async function setupBatch(repo: BatchRepo, userId = ALICE) {
  return repo.create({
    viewSlug: "slugABC123XY",
    userId,
    name: "Wino",
    stage: "fermentacja-burzliwa",
    startDate: "2026-05-20",
    recipeId: null,
  });
}

function makeDeps(
  overrides: Partial<MeasurementServiceDeps> = {},
): MeasurementServiceDeps {
  return {
    batchRepo: overrides.batchRepo ?? createInMemoryBatchRepo(),
    measurementRepo:
      overrides.measurementRepo ?? createInMemoryMeasurementRepo(),
  };
}

describe("MeasurementService.addMeasurement", () => {
  it("właściciel zapisuje pomiar powiązany z nastawem", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const batch = await setupBatch(batchRepo);
    const measurementRepo = createInMemoryMeasurementRepo();
    const svc = createMeasurementService(
      makeDeps({ batchRepo, measurementRepo }),
    );

    const result = await svc.addMeasurement("slugABC123XY", ALICE, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: 22,
      note: "start",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.measurement.batchId).toBe(batch.id);
      expect(result.measurement.brix).toBe(12);
      expect(result.measurement.note).toBe("start");
    }
  });

  it("inny user dostaje forbidden, repo nietknięte", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const measurementRepo = createInMemoryMeasurementRepo();
    const svc = createMeasurementService(
      makeDeps({ batchRepo, measurementRepo }),
    );

    const result = await svc.addMeasurement("slugABC123XY", BOB, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
  });

  it("brak sesji zwraca auth-required (rozróżnione od forbidden)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createMeasurementService(makeDeps({ batchRepo }));

    const result = await svc.addMeasurement("slugABC123XY", undefined, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auth-required");
  });

  it("dla nieistniejącego slug zwraca not-found", async () => {
    const svc = createMeasurementService(makeDeps());
    const result = await svc.addMeasurement("brak", ALICE, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-found");
  });

  it("wymaga przynajmniej jednego z (brix, sg) — inaczej invalid", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createMeasurementService(makeDeps({ batchRepo }));

    const result = await svc.addMeasurement("slugABC123XY", ALICE, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: null,
      sg: null,
      temperatureC: 22,
      note: "tylko temperatura",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("isDemo=true: zapis działa nawet bez sesji", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    await batchRepo.setDemoByViewSlug("slugABC123XY", true);
    const svc = createMeasurementService(makeDeps({ batchRepo }));

    const result = await svc.addMeasurement("slugABC123XY", undefined, {
      measuredAt: "2026-05-25T12:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });
    expect(result.ok).toBe(true);
  });
});

describe("MeasurementService.list", () => {
  it("zwraca pomiary chronologicznie po viewSlug (publicznie, bez sesji)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const batch = await setupBatch(batchRepo);
    const measurementRepo = createInMemoryMeasurementRepo();
    const svc = createMeasurementService(
      makeDeps({ batchRepo, measurementRepo }),
    );

    await svc.addMeasurement("slugABC123XY", ALICE, {
      measuredAt: "2026-06-01T08:00:00.000Z",
      brix: 6,
      sg: null,
      temperatureC: null,
      note: null,
    });
    await svc.addMeasurement("slugABC123XY", ALICE, {
      measuredAt: "2026-05-25T08:00:00.000Z",
      brix: 12,
      sg: null,
      temperatureC: null,
      note: null,
    });

    const list = await svc.list("slugABC123XY");
    expect(list).not.toBeNull();
    expect(list!.map((m) => m.measuredAt)).toEqual([
      "2026-05-25T08:00:00.000Z",
      "2026-06-01T08:00:00.000Z",
    ]);
    expect(list![0].batchId).toBe(batch.id);
  });

  it("dla nieistniejącego slug zwraca null", async () => {
    const svc = createMeasurementService(makeDeps());
    expect(await svc.list("brak")).toBeNull();
  });
});
