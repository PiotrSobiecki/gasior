import type { RecipeInput } from "./repo";

export type Verdict = "pass" | "warn" | "fail";

export type Issue = {
  severity: "low" | "medium" | "high";
  field: string;
  message: string;
};

export type ValidationResult = {
  verdict: Verdict;
  abvCheck: { computedAbv: number; declaredAbv: number; ok: boolean };
  issues: Issue[];
};

// Reguła kciuka: ~17 g cukru / litr ≈ 1% ABV (potencjalny alkohol).
const SUGAR_G_PER_ABV_PER_L = 17;

function computeAbv(sugarKg: number, waterL: number): number {
  if (waterL <= 0) return 0;
  const gramsPerLiter = (sugarKg * 1000) / waterL;
  return Number((gramsPerLiter / SUGAR_G_PER_ABV_PER_L).toFixed(1));
}

const ABV_TOLERANCE = 1.5;
// Typowa górna granica tolerancji dla drożdży winiarskich; powyżej cukier
// zostanie niesfermentowany.
const YEAST_TOLERANCE_ABV = 18;
// Realna granica fermentacji — powyżej trzeba destylacji (poza zakresem apki).
const FERMENTATION_CEILING_ABV = 20;
// Sygnały świadczące o kroku sanitarnym (dezynfekcja / mycie sprzętu).
const SANITATION_CUE = /dezynf|sanit|umyj|wyparz|sterylizu/i;

function hasSanitationStep(steps: string[]): boolean {
  return steps.some((step) => SANITATION_CUE.test(step));
}

// Owoce pestkowe — przy rozgniataniu pestek wydziela się amigdalina
// (prekursor cyjanowodoru). Receptura musi to adresować.
const STONE_FRUITS = new Set(["śliwka", "wiśnia", "morela", "czereśnia", "brzoskwinia"]);
const PIT_WARNING_CUE = /pestk|dryluj|wydryluj|nie rozgniataj/i;

function isStoneFruit(fruit: string): boolean {
  return STONE_FRUITS.has(fruit.toLowerCase().trim());
}

function mentionsPits(steps: string[]): boolean {
  return steps.some((step) => PIT_WARNING_CUE.test(step));
}

// Najwyższa severity dyktuje verdict: high → fail, medium/low → warn, brak → pass.
function verdictFromIssues(issues: Issue[]): Verdict {
  if (issues.some((i) => i.severity === "high")) return "fail";
  if (issues.length > 0) return "warn";
  return "pass";
}

export function validateRecipe(input: RecipeInput): ValidationResult {
  const computedAbv = computeAbv(input.sugarKg, input.waterL);
  const declaredAbv = input.targetAbv;
  const abvDelta = Math.abs(computedAbv - declaredAbv);
  const abvOk = abvDelta <= ABV_TOLERANCE;

  // Nalewka = maceracja w gotowym alkoholu (wódka 40%, spirytus 70%), a nie
  // fermentacja. ABV bierze się z alkoholu bazowego, nie z cukru → nie
  // porównujemy computedAbv z declaredAbv i nie stosujemy ceiling fermentacji.
  const isMaceration = input.category === "nalewka";

  const issues: Issue[] = [];

  if (!isMaceration && !abvOk) {
    issues.push({
      severity: "medium",
      field: "sugarKg",
      message: `Wyliczone ABV (${computedAbv}%) różni się od deklarowanego (${declaredAbv}%) o ${abvDelta.toFixed(1)}%. Sprawdź ilość cukru lub objętość.`,
    });
  }

  if (!isMaceration && declaredAbv > FERMENTATION_CEILING_ABV) {
    issues.push({
      severity: "high",
      field: "targetAbv",
      message: `Docelowe ABV (${declaredAbv}%) jest poza zasięgiem fermentacji (~${FERMENTATION_CEILING_ABV}%). Bez destylacji nieosiągalne; aplikacja dotyczy wyłącznie fermentacji.`,
    });
  } else if (!isMaceration && declaredAbv > YEAST_TOLERANCE_ABV) {
    issues.push({
      severity: "medium",
      field: "yeastType",
      message: `Docelowe ABV (${declaredAbv}%) przekracza typową tolerancję drożdży (~${YEAST_TOLERANCE_ABV}%). Część cukru pozostanie niesfermentowana.`,
    });
  }

  if (!hasSanitationStep(input.steps)) {
    issues.push({
      severity: "medium",
      field: "steps",
      message:
        "Brak kroku sanitarnego (dezynfekcja/wyparzenie sprzętu). Bez tego rośnie ryzyko zakażenia nastawu.",
    });
  }

  if (isStoneFruit(input.fruit) && !mentionsPits(input.steps)) {
    issues.push({
      severity: "high",
      field: "fruit",
      message: `Owoc pestkowy (${input.fruit}) — receptura musi wyraźnie ostrzec przed rozgniataniem pestek (amigdalina → cyjanowodór). Dodaj instrukcję drylowania.`,
    });
  }

  return {
    verdict: verdictFromIssues(issues),
    abvCheck: { computedAbv, declaredAbv, ok: abvOk },
    issues,
  };
}
