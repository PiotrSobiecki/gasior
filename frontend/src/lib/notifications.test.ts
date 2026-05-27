import { describe, it, expect } from "vitest";
import { pendingNotifications } from "./notifications";
import type { BatchPublic } from "./api";

function mkBatch(overrides: Partial<BatchPublic>): BatchPublic {
  return {
    id: "b",
    viewSlug: "slug",
    userId: "u",
    name: "Nastaw",
    stage: "fermentacja-burzliwa",
    startDate: "2026-05-01",
    recipeId: null,
    instructionSteps: [],
    checkedStepIndices: [],
    isDemo: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("pendingNotifications", () => {
  const TODAY = new Date("2026-05-10T12:00:00Z");

  it("zwraca pustą listę gdy wszystkie nastawy są daleko od następnego etapu", () => {
    // Start 2026-05-01, dziś 2026-05-10 → 9 dni od startu.
    // Default burzliwa = 7 dni, więc upcoming[0] = fermentacja-cicha,
    // ale runningEnd liczy od końca poprzedniego etapu — etaDays = 7-9 = -2 → overdue.
    // Dla testu „daleko" potrzebujemy świeżego startu.
    const batches = [
      mkBatch({ startDate: "2026-05-09" }), // zaczęty wczoraj → 1 dzień
    ];
    // Próg 3 dni → najbliższa akcja za 6 dni (7-1=6) → poza oknem.
    const result = pendingNotifications(batches, TODAY, 3);
    expect(result).toEqual([]);
  });

  it("zwraca powiadomienie 'today' gdy etaDays = 0", () => {
    // 7 dni od startu, fermentacja-burzliwa = 7 dni → akcja dziś.
    const batches = [mkBatch({ startDate: "2026-05-03", name: "Aronia" })];
    const result = pendingNotifications(batches, TODAY, 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      batchName: "Aronia",
      etaDays: 0,
      overdue: false,
      urgency: "today",
    });
  });

  it("zwraca 'soon' gdy etaDays w oknie 1..threshold", () => {
    // 5 dni od startu (7-5=2) → za 2 dni.
    const batches = [mkBatch({ startDate: "2026-05-05", name: "Truskawka" })];
    const result = pendingNotifications(batches, TODAY, 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      etaDays: 2,
      overdue: false,
      urgency: "soon",
    });
  });

  it("zwraca 'overdue' gdy etap powinien był się skończyć dawno temu", () => {
    // 15 dni od startu fermentacji burzliwej (default 7 dni) → overdue 8 dni.
    const batches = [mkBatch({ startDate: "2026-04-25", name: "Pigwa" })];
    const result = pendingNotifications(batches, TODAY, 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      overdue: true,
      etaDays: 0,
      urgency: "overdue",
      actionLabel: "Zlewanie znad osadu",
    });
  });

  it("sortuje: overdue przed today, today przed soon, w grupie po etaDays", () => {
    const batches = [
      // Start dalej w przeszłości → bliżej deadline'u (mniej dni do akcji).
      mkBatch({ id: "1", name: "Soon-2dni", startDate: "2026-05-05" }), // za 2 dni
      mkBatch({ id: "2", name: "Today",    startDate: "2026-05-03" }), // dziś
      mkBatch({ id: "3", name: "Overdue",  startDate: "2026-04-25" }), // overdue
      mkBatch({ id: "4", name: "Soon-3dni", startDate: "2026-05-06" }), // za 3 dni
    ];
    const result = pendingNotifications(batches, TODAY, 3);
    expect(result.map((n) => n.batchName)).toEqual([
      "Overdue",
      "Today",
      "Soon-2dni",
      "Soon-3dni",
    ]);
  });

  it("pomija nastawy w ostatnim etapie (butelkowanie — brak upcoming)", () => {
    const batches = [mkBatch({ stage: "butelkowanie" })];
    expect(pendingNotifications(batches, TODAY, 3)).toEqual([]);
  });

  it("respektuje custom threshold (7 dni)", () => {
    const batches = [mkBatch({ startDate: "2026-05-05", name: "Truskawka" })]; // za 2 dni
    // przy threshold = 1 wypada poza oknem
    expect(pendingNotifications(batches, TODAY, 1)).toEqual([]);
    // przy threshold = 7 jest w oknie
    expect(pendingNotifications(batches, TODAY, 7)).toHaveLength(1);
  });
});
