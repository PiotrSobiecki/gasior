import {
  toPublic,
  type BatchPatch,
  type BatchPublic,
  type BatchRepo,
} from "./repo";

// Wejście do tworzenia nastawu — minimalne, ale wystarczające na tracerze.
// userId pochodzi z bieżącej sesji (route wymusza autoryzację).
export type CreateBatchInput = {
  userId: string;
  name: string;
  startDate: string;
  recipeId: string | null;
  instructionSteps?: string[];
};

// Po przejściu na konta: tworzymy nastaw i od razu zwracamy publiczny widok.
// Brak `editCode` — autoryzacja idzie przez sesję (cookie HttpOnly).
export type CreateBatchResult =
  | { ok: true; batch: BatchPublic }
  | { ok: false; reason: "recipe-not-found" };

export type UpdateBatchResult =
  | { ok: true; batch: BatchPublic }
  | { ok: false; reason: "not-found" | "auth-required" | "forbidden" };

export type BatchServiceDeps = {
  repo: BatchRepo;
  generateViewSlug: () => string;
  // Sprawdza czy receptura o danym id istnieje. Opcjonalna zależność —
  // bez niej tworzymy nastaw z dowolnym recipeId (zostawiamy walidację bazie).
  verifyRecipeExists?: (id: string) => Promise<boolean>;
  // Kroki z receptury — snapshot przy tworzeniu nastawu z recipeId.
  getRecipeSteps?: (id: string) => Promise<string[] | null>;
};

export interface BatchService {
  createBatch(input: CreateBatchInput): Promise<CreateBatchResult>;
  getPublic(viewSlug: string): Promise<BatchPublic | null>;
  listForUser(userId: string): Promise<BatchPublic[]>;
  // actorUserId === undefined → użytkownik niezalogowany.
  // Dla nastawu z `isDemo=true` przepuszczamy każdego. Dla zwykłego — tylko
  // właściciela; inny user → 'forbidden', brak sesji → 'auth-required'.
  updateBatch(
    viewSlug: string,
    actorUserId: string | undefined,
    patch: BatchPatch,
  ): Promise<UpdateBatchResult>;
}

export function createBatchService(deps: BatchServiceDeps): BatchService {
  return {
    async createBatch(input) {
      // Weryfikuj recepturę PRZED wygenerowaniem credentials i zapisem —
      // bez tego śmieciowo wykorzystywałbym pulę slugów dla niepoprawnych
      // wejść (a w prod FK i tak by odrzucił insert z 500).
      if (input.recipeId && deps.verifyRecipeExists) {
        const exists = await deps.verifyRecipeExists(input.recipeId);
        if (!exists) return { ok: false, reason: "recipe-not-found" };
      }

      let instructionSteps = input.instructionSteps ?? [];
      if (
        instructionSteps.length === 0 &&
        input.recipeId &&
        deps.getRecipeSteps
      ) {
        const fromRecipe = await deps.getRecipeSteps(input.recipeId);
        if (fromRecipe?.length) instructionSteps = fromRecipe;
      }

      const viewSlug = deps.generateViewSlug();
      const created = await deps.repo.create({
        viewSlug,
        userId: input.userId,
        name: input.name,
        stage: "fermentacja-burzliwa",
        startDate: input.startDate,
        recipeId: input.recipeId,
        instructionSteps,
        checkedStepIndices: [],
      });

      return { ok: true, batch: toPublic(created) };
    },

    async getPublic(viewSlug) {
      const row = await deps.repo.getByViewSlug(viewSlug);
      return row ? toPublic(row) : null;
    },

    async listForUser(userId) {
      const rows = await deps.repo.listByUserId(userId);
      return rows.map(toPublic);
    },

    async updateBatch(viewSlug, actorUserId, patch) {
      const row = await deps.repo.getByViewSlug(viewSlug);
      if (!row) return { ok: false, reason: "not-found" };

      // Demo: tryb pokazowy pomija sprawdzanie właściciela — edytuje każdy.
      if (!row.isDemo) {
        if (actorUserId === undefined) {
          return { ok: false, reason: "auth-required" };
        }
        if (actorUserId !== row.userId) {
          return { ok: false, reason: "forbidden" };
        }
      }

      // Akceptujemy tylko jawnie dozwolone pola; reszta jest ignorowana.
      const safe: BatchPatch = {};
      if (patch.stage !== undefined) safe.stage = patch.stage;
      if (patch.startDate !== undefined) safe.startDate = patch.startDate;
      if (patch.checkedStepIndices !== undefined) {
        const max = row.instructionSteps.length;
        safe.checkedStepIndices = [
          ...new Set(
            patch.checkedStepIndices.filter(
              (i) => Number.isInteger(i) && i >= 0 && i < max,
            ),
          ),
        ].sort((a, b) => a - b);
      }

      const updated = await deps.repo.updateByViewSlug(viewSlug, safe);
      if (!updated) return { ok: false, reason: "not-found" };
      return { ok: true, batch: toPublic(updated) };
    },
  };
}
