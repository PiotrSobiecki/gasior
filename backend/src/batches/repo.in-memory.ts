import type { Batch, BatchInput, BatchPatch, BatchRepo } from "./repo";

// In-memory implementacja BatchRepo — test double i scenariusze deweloperskie.
export function createInMemoryBatchRepo(initial: Batch[] = []): BatchRepo {
  const batches = [...initial];
  return {
    async create(input: BatchInput) {
      const batch: Batch = {
        ...input,
        isDemo: input.isDemo ?? false,
        instructionSteps: input.instructionSteps ?? [],
        checkedStepIndices: input.checkedStepIndices ?? [],
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      batches.push(batch);
      return batch;
    },
    async getByViewSlug(viewSlug) {
      return batches.find((b) => b.viewSlug === viewSlug) ?? null;
    },
    async listByUserId(userId) {
      // Najnowsze nastawy na górę — zgodnie z UX dashboardu.
      return batches
        .filter((b) => b.userId === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    async updateByViewSlug(viewSlug, patch: BatchPatch) {
      const idx = batches.findIndex((b) => b.viewSlug === viewSlug);
      if (idx === -1) return null;
      // Sanitizujemy patch — przyjmujemy tylko jawnie dozwolone pola,
      // żeby zewnętrzny atakujący (gdyby ominął typy) nie nadpisał userId.
      const safe: BatchPatch = {};
      if (patch.stage !== undefined) safe.stage = patch.stage;
      if (patch.startDate !== undefined) safe.startDate = patch.startDate;
      if (patch.checkedStepIndices !== undefined) {
        safe.checkedStepIndices = patch.checkedStepIndices;
      }
      batches[idx] = { ...batches[idx], ...safe };
      return batches[idx];
    },
    async setDemoByViewSlug(viewSlug, isDemo) {
      const idx = batches.findIndex((b) => b.viewSlug === viewSlug);
      if (idx === -1) return null;
      batches[idx] = { ...batches[idx], isDemo };
      return batches[idx];
    },
  };
}
