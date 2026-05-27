import { z } from "zod";
import { BATCH_STAGES } from "./repo";

// YYYY-MM-DD; sprawdza format + realność daty (np. odrzuca 2026-13-40).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Niepoprawna data");

export const batchStageSchema = z.enum(BATCH_STAGES);

const instructionStepSchema = z
  .string()
  .min(1, "Krok instrukcji nie może być pusty")
  .max(2000);

export const instructionStepsSchema = z
  .array(instructionStepSchema)
  .max(50, "Maksymalnie 50 kroków instrukcji");

export const checkedStepIndicesSchema = z
  .array(z.number().int().min(0).max(49))
  .max(50, "Maksymalnie 50 zaznaczonych kroków");

export const createBatchBodySchema = z.object({
  name: z.string().min(1, "Nazwa nastawu jest wymagana").max(200),
  startDate: isoDate,
  recipeId: z.string().uuid().optional().nullable(),
  instructionSteps: instructionStepsSchema.optional(),
});

export type CreateBatchBody = z.infer<typeof createBatchBodySchema>;

// Świadomie BEZ .strict(): nieznane pola (np. name, recipeId, editCodeHash)
// są po cichu pomijane. Serwis i tak akceptuje tylko stage/startDate, więc
// dodatkowo zatrzymujemy zapis już na poziomie wejścia.
export const patchBatchBodySchema = z.object({
  stage: batchStageSchema.optional(),
  startDate: isoDate.optional(),
  checkedStepIndices: checkedStepIndicesSchema.optional(),
});

export type PatchBatchBody = z.infer<typeof patchBatchBodySchema>;
