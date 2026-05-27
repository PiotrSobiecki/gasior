import { z } from "zod";
import { recipeInputSchema } from "./validation";
import type { RecipeInput } from "./repo";

// Receptury z importu (skrypt kuratora) domyślnie trafiają jako "validated",
// bo przeszły przez recipe-validator przed importem.
const recipeImportSchema = recipeInputSchema.extend({
  status: z.enum(["draft", "validated"]).default("validated"),
});

export type ParseResult =
  | { ok: true; value: RecipeInput }
  | { ok: false; errors: z.ZodIssue[] };

export function parseRecipeImport(record: unknown): ParseResult {
  const parsed = recipeImportSchema.safeParse(record);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues };
  return { ok: true, value: parsed.data };
}
