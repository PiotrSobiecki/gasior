import { z } from "zod";

// Kategorie napoju — wybór z PRD. URL-safe, bez polskich znaków; UI mapuje
// na ładne etykiety ("miod" → "Miód pitny" itd.).
export const RECIPE_CATEGORIES = ["wino", "nalewka", "cydr", "miod"] as const;
export const recipeCategorySchema = z.enum(RECIPE_CATEGORIES);
export type RecipeCategory = z.infer<typeof recipeCategorySchema>;

// Walidacja danych wejściowych receptury. Status domyślnie "draft" przy zapisie
// przez API; ścieżka importu ustawia "validated" osobno.
export const recipeInputSchema = z.object({
  name: z.string().min(1),
  fruit: z.string().min(1),
  category: recipeCategorySchema,
  fruitKg: z.number().positive(),
  // sugarKg może być 0 — miód pitny (cukier z miodu), cydr z samego soku.
  sugarKg: z.number().min(0),
  // waterL może być 0 — klasyczne nalewki (sam alkohol + owoce), cydr z soku.
  waterL: z.number().min(0),
  yeastType: z.string().min(1),
  // ABV do 70% — nalewki na spirytusie/wódce (maceracja alkoholowa) bywają
  // 40-45%; semantyczny walidator (validateRecipe) rozróżnia kategorie.
  targetAbv: z.number().min(0).max(70),
  fermentationDays: z.number().int().positive(),
  steps: z.array(z.string()).default([]),
  sourceUrls: z.array(z.string().url()).default([]),
  status: z.enum(["draft", "validated"]).default("draft"),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
