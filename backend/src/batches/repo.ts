export const BATCH_STAGES = [
  "fermentacja-burzliwa",
  "fermentacja-cicha",
  "dojrzewanie",
  "butelkowanie",
] as const;

export type BatchStage = (typeof BATCH_STAGES)[number];

export type Batch = {
  id: string;
  viewSlug: string;
  userId: string;            // właściciel (FK users.id)
  name: string;
  stage: BatchStage;
  startDate: string;         // ISO date (YYYY-MM-DD)
  recipeId: string | null;
  // Tryb pokazowy — patrz schema.ts; gdy true, mutacje są otwarte dla
  // wszystkich (niezależnie od `userId`).
  isDemo: boolean;
  instructionSteps: string[];
  checkedStepIndices: number[];
  createdAt: string;         // ISO timestamp
};

// BatchPublic — to, co wraca przez API. Świadomie eksponujemy userId, żeby
// frontend mógł sprawdzić "czy to mój" bez dodatkowego zapytania.
export type BatchPublic = Batch;

export function toPublic(batch: Batch): BatchPublic {
  // Pole-po-polu, by przypadkowy refactor nie dodał wrażliwych pól na siłę.
  return {
    id: batch.id,
    viewSlug: batch.viewSlug,
    userId: batch.userId,
    name: batch.name,
    stage: batch.stage,
    startDate: batch.startDate,
    recipeId: batch.recipeId,
    isDemo: batch.isDemo,
    instructionSteps: batch.instructionSteps,
    checkedStepIndices: batch.checkedStepIndices,
    createdAt: batch.createdAt,
  };
}

// BatchInput — co serwis wkłada do repo przy tworzeniu. Generowanie viewSlug
// nadal robi serwis, ale userId musi przyjść z kontekstu (sesja użytkownika).
export type BatchInput = {
  viewSlug: string;
  userId: string;
  name: string;
  stage: BatchStage;
  startDate: string;
  recipeId: string | null;
  isDemo?: boolean;
  instructionSteps?: string[];
  checkedStepIndices?: number[];
};

// BatchPatch — pola dozwolone do zmiany przez właściciela.
export type BatchPatch = {
  stage?: BatchStage;
  startDate?: string;
  checkedStepIndices?: number[];
};

export interface BatchRepo {
  create(input: BatchInput): Promise<Batch>;
  getByViewSlug(viewSlug: string): Promise<Batch | null>;
  listByUserId(userId: string): Promise<Batch[]>;
  updateByViewSlug(viewSlug: string, patch: BatchPatch): Promise<Batch | null>;
  // Specyficzna mutacja do zarządzania demo-mode (CLI/admin).
  setDemoByViewSlug(viewSlug: string, isDemo: boolean): Promise<Batch | null>;
}
