import type { Recipe } from "./api";
import type { DrinkType, NastawPlan } from "./calc";
import { planNastaw } from "./calc";
import type { TemplateContext } from "./batchTemplateSteps";
import { buildTemplateSteps } from "./batchTemplateSteps";
import { canonicalFruit } from "./fruits";

export type AlignedPlan = NastawPlan & {
  fruitKg?: number;
  alignedFromRecipes: boolean;
  referenceRecipeNames: string[];
};

export type WizardStepsResult = {
  steps: string[];
  source: "recipe" | "template";
  referenceRecipeName?: string;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fruitMatches(recipeFruit: string, selectedFruit: string): boolean {
  const a = canonicalFruit(recipeFruit);
  const b = canonicalFruit(selectedFruit);
  if (a === b) return true;
  // „porzeczka” w kreatorze → „czarna porzeczka” / „porzeczka czerwona” w bazie.
  return a.includes(b) || b.includes(a);
}

/** Receptury tego samego owocu i typu — validated pierwsze, potem bliskość ABV. */
export function filterSimilarRecipes(
  recipes: Recipe[],
  type: DrinkType,
  fruit: string,
  targetAbv?: number,
): Recipe[] {
  const list = Array.isArray(recipes) ? recipes.filter(Boolean) : [];
  const matching = list.filter(
    (r) => r.category === type && fruitMatches(r.fruit, fruit),
  );

  return [...matching].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "validated" ? -1 : 1;
    }
    if (targetAbv !== undefined) {
      return (
        Math.abs(a.targetAbv - targetAbv) - Math.abs(b.targetAbv - targetAbv)
      );
    }
    return 0;
  });
}

function scaleRecipeToVolume(recipe: Recipe, targetWaterL: number) {
  const baseVol = recipe.waterL > 0 ? recipe.waterL : targetWaterL;
  const scale = baseVol > 0 ? targetWaterL / baseVol : 1;
  return {
    sugarKg: recipe.sugarKg * scale,
    fruitKg: recipe.fruitKg * scale,
  };
}

export function alignPlan(
  base: NastawPlan,
  similar: Recipe[],
  waterL: number,
  _type: DrinkType,
): AlignedPlan {
  if (similar.length === 0) {
    return { ...base, alignedFromRecipes: false, referenceRecipeNames: [] };
  }

  const scaled = similar.map((r) => scaleRecipeToVolume(r, waterL));
  const recipeSugar = median(scaled.map((s) => s.sugarKg));
  const recipeFruit = median(scaled.map((s) => s.fruitKg));
  const recipeDays = median(similar.map((r) => r.fermentationDays));

  const sugarKg = round2(0.65 * recipeSugar + 0.35 * base.sugarKg);
  const fermentationDays =
    Math.round(recipeDays) > 0
      ? Math.round(recipeDays)
      : base.fermentationDays;

  const yeastType =
    similar.find((r) => r.yeastType.trim().length > 0)?.yeastType ??
    base.yeastType;

  return {
    ...base,
    sugarKg: sugarKg > 0 ? sugarKg : base.sugarKg,
    fruitKg: recipeFruit > 0 ? round2(recipeFruit) : undefined,
    fermentationDays,
    yeastType,
    alignedFromRecipes: true,
    referenceRecipeNames: similar.slice(0, 3).map((r) => r.name),
  };
}

export function buildAlignedPlan(
  type: DrinkType,
  fruit: string,
  waterL: number,
  targetAbv: number,
  recipes: Recipe[],
): AlignedPlan {
  const base = planNastaw(type, waterL, targetAbv);
  const similar = filterSimilarRecipes(recipes, type, fruit, targetAbv);
  return alignPlan(base, similar, waterL, type);
}

const MIN_RECIPE_STEPS = 4;
const MAX_WIZARD_STEPS = 12;

/** Kroki z najlepszej pasującej receptury lub szablon generyczny. */
export function buildWizardSteps(
  ctx: TemplateContext,
  recipes: Recipe[],
): WizardStepsResult {
  const similar = filterSimilarRecipes(
    recipes,
    ctx.type,
    ctx.fruit,
    ctx.targetAbv,
  );
  const best = similar.find((r) => r.steps.length >= MIN_RECIPE_STEPS);

  if (best) {
    const steps = best.steps.slice(0, MAX_WIZARD_STEPS);
    return {
      steps,
      source: "recipe",
      referenceRecipeName: best.name,
    };
  }

  return {
    steps: buildTemplateSteps(ctx),
    source: "template",
  };
}
