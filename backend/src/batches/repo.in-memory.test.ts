import { describe, it, expect } from "vitest";
import { createInMemoryBatchRepo } from "./repo.in-memory";
import type { BatchInput } from "./repo";

const ALICE = "11111111-1111-4111-a111-111111111111";

const sample: BatchInput = {
  viewSlug: "abc123XYZ_-1",
  userId: ALICE,
  name: "Mój pierwszy nastaw",
  stage: "fermentacja-burzliwa",
  startDate: "2026-05-20",
  recipeId: null,
};

describe("createInMemoryBatchRepo", () => {
  it("create() generuje id i createdAt, zachowuje wszystkie pola wejścia", async () => {
    const repo = createInMemoryBatchRepo();
    const batch = await repo.create(sample);

    expect(batch.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(batch.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(batch).toMatchObject(sample);
  });

  it("getByViewSlug() zwraca utworzony rekord po slug", async () => {
    const repo = createInMemoryBatchRepo();
    const created = await repo.create(sample);
    const found = await repo.getByViewSlug(sample.viewSlug);
    expect(found).toEqual(created);
  });

  it("getByViewSlug() zwraca null dla nieistniejącego slug", async () => {
    const repo = createInMemoryBatchRepo();
    expect(await repo.getByViewSlug("nieistnieje123")).toBeNull();
  });

  it("updateByViewSlug() zmienia stage i zwraca świeży rekord", async () => {
    const repo = createInMemoryBatchRepo();
    await repo.create(sample);
    const updated = await repo.updateByViewSlug(sample.viewSlug, {
      stage: "fermentacja-cicha",
    });
    expect(updated?.stage).toBe("fermentacja-cicha");

    const fetched = await repo.getByViewSlug(sample.viewSlug);
    expect(fetched?.stage).toBe("fermentacja-cicha");
  });

  it("updateByViewSlug() zmienia tylko podane pola, reszta nietknięta", async () => {
    const repo = createInMemoryBatchRepo();
    await repo.create(sample);
    const updated = await repo.updateByViewSlug(sample.viewSlug, {
      startDate: "2026-06-01",
    });
    expect(updated?.startDate).toBe("2026-06-01");
    expect(updated?.stage).toBe("fermentacja-burzliwa");
    expect(updated?.name).toBe(sample.name);
  });

  it("updateByViewSlug() zwraca null dla nieistniejącego slug", async () => {
    const repo = createInMemoryBatchRepo();
    const result = await repo.updateByViewSlug("brak", {
      stage: "dojrzewanie",
    });
    expect(result).toBeNull();
  });

  it("nie podmienia userId przez patch (patch jest typowany)", async () => {
    const repo = createInMemoryBatchRepo();
    await repo.create(sample);
    // Próba przemycenia userId przez patch — typescript blokuje, runtime ignoruje.
    await repo.updateByViewSlug(sample.viewSlug, {
      // @ts-expect-error pola spoza patcha nie powinny być akceptowane
      userId: "22222222-2222-4222-a222-222222222222",
    });
    const fetched = await repo.getByViewSlug(sample.viewSlug);
    expect(fetched?.userId).toBe(ALICE);
  });
});
