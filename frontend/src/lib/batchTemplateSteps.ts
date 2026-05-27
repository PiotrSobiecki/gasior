import type { DrinkType } from "./calc";

const STORAGE_PREFIX = "gasior:batch-template-steps:";

export type TemplateContext = {
  type: DrinkType;
  fruit: string;
  waterL: number;
  targetAbv: number;
};

function key(batchId: string): string {
  return `${STORAGE_PREFIX}${batchId}`;
}

function roundL(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

export function buildTemplateSteps(ctx: TemplateContext): string[] {
  const fruit = ctx.fruit;
  const volume = roundL(ctx.waterL);
  if (ctx.type === "nalewka") {
    return [
      "Wyparz słój i wszystkie narzędzia, pracuj na czystym sprzęcie.",
      `Przygotuj owoce (${fruit}) — umyj, oczyść, usuń części uszkodzone.`,
      `Umieść owoce w słoju, dodaj cukier i zalej alkoholem bazowym pod docelowe ${ctx.targetAbv}% ABV.`,
      "Odstaw do maceracji, co 2-3 dni delikatnie potrząśnij słojem.",
      "Po zakończeniu maceracji zlej nalew, odfiltruj osad i połącz z syropem owocowym (jeśli robisz).",
      "Rozlej do butelek i odstaw do dojrzewania na minimum kilka tygodni.",
    ];
  }

  return [
    "Wyparz fermentor/gąsior, rurkę i akcesoria — sanitacja to podstawa.",
    `Przygotuj surowiec (${fruit}) i nastaw o objętości ok. ${volume} l.`,
    `Ustaw cukier pod docelowe ${ctx.targetAbv}% ABV i dobrze napowietrz nastaw.`,
    "Zadaj odpowiednie drożdże, rozpocznij fermentację burzliwą i kontroluj temperaturę.",
    "Po ustaniu burzliwej zlej znad osadu na fermentację cichą.",
    "Po wyklarowaniu przelej do dojrzewania, a na końcu zabutelkuj.",
  ];
}

export function saveTemplateSteps(batchId: string, steps: string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key(batchId), JSON.stringify(steps));
}

export function loadTemplateSteps(batchId: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(batchId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}
