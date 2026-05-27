import { describe, it, expect } from "vitest";
import { createInMemoryBatchRepo } from "./repo.in-memory";
import { createBatchService, type BatchServiceDeps } from "./service";

const ALICE = "11111111-1111-4111-a111-111111111111";
const BOB = "22222222-2222-4222-a222-222222222222";

// Deterministyczne zależności dla testów: stały generator slug.
function makeDeps(overrides: Partial<BatchServiceDeps> = {}): BatchServiceDeps {
  return {
    repo: createInMemoryBatchRepo(),
    generateViewSlug: () => "slugABCDEF12",
    ...overrides,
  };
}

// Helper: tworzy nastaw i rzuca w testach, gdy serwis zwrócił ok:false.
async function expectCreateOk(
  svc: ReturnType<typeof createBatchService>,
  input: Parameters<typeof svc.createBatch>[0],
) {
  const r = await svc.createBatch(input);
  if (!r.ok) throw new Error(`createBatch failed: ${r.reason}`);
  return r;
}

describe("BatchService.createBatch", () => {
  it("zwraca publiczny widok nastawu z userId właściciela (bez editCode)", async () => {
    const svc = createBatchService(makeDeps());

    const result = await svc.createBatch({
      userId: ALICE,
      name: "Wino z aronii 2026",
      startDate: "2026-05-20",
      recipeId: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batch).toMatchObject({
      viewSlug: "slugABCDEF12",
      userId: ALICE,
      name: "Wino z aronii 2026",
      startDate: "2026-05-20",
      stage: "fermentacja-burzliwa",
      recipeId: null,
    });
    // Po przejściu na konta editCode i jego hash zniknęły z modelu publicznego.
    expect("editCode" in (result as object)).toBe(false);
    expect("editCodeHash" in result.batch).toBe(false);
  });

  it("domyślny stage to fermentacja-burzliwa", async () => {
    const svc = createBatchService(makeDeps());
    const r = await svc.createBatch({
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.batch.stage).toBe("fermentacja-burzliwa");
  });

  it("z recipeId zapisuje powiązanie w polu recipeId", async () => {
    const repo = createInMemoryBatchRepo();
    const verifyRecipeExists = async (id: string) =>
      id === "11111111-1111-4111-a111-111111111111";
    const svc = createBatchService(makeDeps({ repo, verifyRecipeExists }));

    const r = await svc.createBatch({
      userId: ALICE,
      name: "Wino z aronii",
      startDate: "2026-05-20",
      recipeId: "11111111-1111-4111-a111-111111111111",
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.recipeId).toBe("11111111-1111-4111-a111-111111111111");
  });

  it("z nieistniejącym recipeId zwraca recipe-not-found, repo nietknięte", async () => {
    const repo = createInMemoryBatchRepo();
    const verifyRecipeExists = async () => false;
    const svc = createBatchService(makeDeps({ repo, verifyRecipeExists }));

    const r = await svc.createBatch({
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: "22222222-2222-4222-a222-222222222222",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("recipe-not-found");
    expect(await repo.getByViewSlug("slugABCDEF12")).toBeNull();
  });

  it("kopiuje kroki z receptury przy recipeId bez instructionSteps w body", async () => {
    const recipeId = "11111111-1111-4111-a111-111111111111";
    const verifyRecipeExists = async (id: string) => id === recipeId;
    const getRecipeSteps = async (id: string) =>
      id === recipeId ? ["krok A", "krok B"] : null;
    const svc = createBatchService(
      makeDeps({ verifyRecipeExists, getRecipeSteps }),
    );

    const r = await svc.createBatch({
      userId: ALICE,
      name: "Z receptury",
      startDate: "2026-01-01",
      recipeId,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.batch.instructionSteps).toEqual(["krok A", "krok B"]);
      expect(r.batch.checkedStepIndices).toEqual([]);
    }
  });

  it("przyjmuje instructionSteps z body (ścieżka kreatora)", async () => {
    const svc = createBatchService(makeDeps());
    const r = await svc.createBatch({
      userId: ALICE,
      name: "Kreator",
      startDate: "2026-01-01",
      recipeId: null,
      instructionSteps: ["sanitacja", "fermentacja"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.instructionSteps).toEqual(["sanitacja", "fermentacja"]);
  });

  it("bez recipeId nie wywołuje verifyRecipeExists", async () => {
    let called = 0;
    const verifyRecipeExists = async () => {
      called++;
      return true;
    };
    const svc = createBatchService(makeDeps({ verifyRecipeExists }));

    await svc.createBatch({
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });
    expect(called).toBe(0);
  });
});

describe("BatchService.getPublic", () => {
  it("zwraca BatchPublic z userId", async () => {
    const svc = createBatchService(makeDeps());
    await svc.createBatch({
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const found = await svc.getPublic("slugABCDEF12");
    expect(found?.userId).toBe(ALICE);
    expect(found?.viewSlug).toBe("slugABCDEF12");
    expect("editCodeHash" in (found as object)).toBe(false);
  });

  it("zwraca null dla nieistniejącego slug", async () => {
    const svc = createBatchService(makeDeps());
    expect(await svc.getPublic("nieistnieje")).toBeNull();
  });
});

describe("BatchService.listForUser", () => {
  it("zwraca tylko nastawy danego użytkownika", async () => {
    const repo = createInMemoryBatchRepo();
    // dwa różne slugi
    let i = 0;
    const svc = createBatchService(
      makeDeps({ repo, generateViewSlug: () => `slug${i++}` }),
    );

    await expectCreateOk(svc, {
      userId: ALICE,
      name: "A1",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await expectCreateOk(svc, {
      userId: BOB,
      name: "B1",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "A2",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const alicesList = await svc.listForUser(ALICE);
    expect(alicesList.map((b) => b.name).sort()).toEqual(["A1", "A2"]);
    const bobsList = await svc.listForUser(BOB);
    expect(bobsList.map((b) => b.name)).toEqual(["B1"]);
  });

  it("zwraca pustą listę gdy user nie ma żadnych nastawów", async () => {
    const svc = createBatchService(makeDeps());
    expect(await svc.listForUser(ALICE)).toEqual([]);
  });
});

describe("BatchService.updateBatch", () => {
  it("właściciel zapisuje zmianę stage", async () => {
    const svc = createBatchService(makeDeps());
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const result = await svc.updateBatch("slugABCDEF12", ALICE, {
      stage: "fermentacja-cicha",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.batch.stage).toBe("fermentacja-cicha");
  });

  it("właściciel zapisuje zmianę startDate", async () => {
    const svc = createBatchService(makeDeps());
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const r = await svc.updateBatch("slugABCDEF12", ALICE, {
      startDate: "2026-02-15",
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.startDate).toBe("2026-02-15");
  });

  it("inny user (zalogowany) dostaje forbidden i danych nie tknie", async () => {
    const repo = createInMemoryBatchRepo();
    const svc = createBatchService(makeDeps({ repo }));
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const r = await svc.updateBatch("slugABCDEF12", BOB, {
      stage: "dojrzewanie",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("forbidden");
    const stored = await repo.getByViewSlug("slugABCDEF12");
    expect(stored?.stage).toBe("fermentacja-burzliwa");
  });

  it("brak sesji zwraca auth-required (rozróżnione od forbidden)", async () => {
    const svc = createBatchService(makeDeps());
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const r = await svc.updateBatch("slugABCDEF12", undefined, {
      stage: "dojrzewanie",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("auth-required");
  });

  it("dla nieistniejącego slug zwraca not-found", async () => {
    const svc = createBatchService(makeDeps());

    const r = await svc.updateBatch("nieistnieje", ALICE, {
      stage: "dojrzewanie",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not-found");
  });

  // ─── Tryb demo (publiczny, bez wymogu sesji ani właściciela) ──────

  it("dla isDemo=true edycja działa bez zalogowania", async () => {
    const repo = createInMemoryBatchRepo();
    const svc = createBatchService(makeDeps({ repo }));
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "Demo",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await repo.setDemoByViewSlug("slugABCDEF12", true);

    const r = await svc.updateBatch("slugABCDEF12", undefined, {
      stage: "dojrzewanie",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.stage).toBe("dojrzewanie");
  });

  it("dla isDemo=true edycja działa też dla innego usera", async () => {
    const repo = createInMemoryBatchRepo();
    const svc = createBatchService(makeDeps({ repo }));
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "Demo",
      startDate: "2026-01-01",
      recipeId: null,
    });
    await repo.setDemoByViewSlug("slugABCDEF12", true);

    const r = await svc.updateBatch("slugABCDEF12", BOB, {
      stage: "butelkowanie",
    });
    expect(r.ok).toBe(true);
  });

  it("właściciel zapisuje checkedStepIndices", async () => {
    const svc = createBatchService(makeDeps());
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
      instructionSteps: ["a", "b", "c"],
    });

    const r = await svc.updateBatch("slugABCDEF12", ALICE, {
      checkedStepIndices: [0, 2, 99],
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.checkedStepIndices).toEqual([0, 2]);
  });

  it("akceptuje wszystkie 4 dozwolone wartości stage", async () => {
    const svc = createBatchService(makeDeps());
    await expectCreateOk(svc, {
      userId: ALICE,
      name: "X",
      startDate: "2026-01-01",
      recipeId: null,
    });

    const stages = [
      "fermentacja-burzliwa",
      "fermentacja-cicha",
      "dojrzewanie",
      "butelkowanie",
    ] as const;

    for (const stage of stages) {
      const result = await svc.updateBatch("slugABCDEF12", ALICE, { stage });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.batch.stage).toBe(stage);
    }
  });
});
