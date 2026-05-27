// Czysta logika kreatora nastawu — dobór proporcji na podstawie wyborów użytkownika.
// Rozróżnia dwie metody: fermentację (wino/cydr/miód) i macerację na spirytusie
// (nalewka — moc z dodanego spirytusu spożywczego, BEZ destylacji).

export type DrinkType = "wino" | "nalewka" | "cydr" | "miod";

// ~17 g cukru na litr brzeczki ≈ 1% ABV (potencjalny alkohol z fermentacji).
export const SUGAR_G_PER_ABV_PER_L = 17;
// Spirytus spożywczy używany do nalewek.
export const SPIRIT_STRENGTH = 95;
// Orientacyjny cukier przy maceracji (kg na litr).
export const MACERATION_SUGAR_KG_PER_L = 0.3;

export const DRINK_TYPES: Record<
  DrinkType,
  { label: string; emoji: string; yeast: string; days: number; hint: string }
> = {
  wino: {
    label: "Wino owocowe",
    emoji: "🍷",
    yeast: "drożdże winiarskie",
    days: 35,
    hint: "Klasyczny nastaw z soku/miąższu owoców.",
  },
  nalewka: {
    label: "Nalewka",
    emoji: "🥃",
    yeast: "bez drożdży — maceracja na spirytusie",
    days: 28,
    hint: "Owoce z cukrem zalane spirytusem. Mocna i alkoholowa.",
  },
  cydr: {
    label: "Cydr",
    emoji: "🍎",
    yeast: "drożdże do cydru",
    days: 18,
    hint: "Lekki, musujący nastaw jabłkowy.",
  },
  miod: {
    label: "Miód pitny",
    emoji: "🍯",
    yeast: "drożdże do miodów",
    days: 60,
    hint: "Sycony miód z wodą, długie dojrzewanie.",
  },
};

export type Style = { id: string; label: string; abv: number; hint: string };

const STYLES_BY_TYPE: Record<DrinkType, Style[]> = {
  wino: [
    {
      id: "lekkie",
      label: "Lekkie",
      abv: 10.5,
      hint: "Delikatniejsze, bardziej pijalne.",
    },
    {
      id: "klasyczne",
      label: "Klasyczne",
      abv: 12.5,
      hint: "Najczęstszy domowy zakres.",
    },
    {
      id: "mocniejsze",
      label: "Mocniejsze",
      abv: 14.5,
      hint: "Wyższa moc i pełniejsze ciało.",
    },
  ],
  cydr: [
    {
      id: "lekkie",
      label: "Lekkie",
      abv: 4.5,
      hint: "Session cydr na co dzień.",
    },
    {
      id: "klasyczne",
      label: "Klasyczne",
      abv: 6,
      hint: "Najbardziej typowy poziom.",
    },
    {
      id: "mocniejsze",
      label: "Mocniejsze",
      abv: 7.5,
      hint: "Bliżej stylu cydru wytrawnego.",
    },
  ],
  miod: [
    {
      id: "lekkie",
      label: "Lekkie",
      abv: 11,
      hint: "Lżejszy miód pitny.",
    },
    {
      id: "klasyczne",
      label: "Klasyczne",
      abv: 13.5,
      hint: "Dobry balans mocy i słodyczy.",
    },
    {
      id: "mocniejsze",
      label: "Mocniejsze",
      abv: 16,
      hint: "Wymaga dobrej kondycji drożdży.",
    },
  ],
  nalewka: [
    {
      id: "lagodna",
      label: "Łagodna",
      abv: 20,
      hint: "Mniej spirytusu, bardziej owocowa.",
    },
    {
      id: "klasyczna",
      label: "Klasyczna",
      abv: 28,
      hint: "Najczęściej wybierany poziom.",
    },
    {
      id: "mocna",
      label: "Mocna",
      abv: 36,
      hint: "Wyraźnie alkoholowa.",
    },
  ],
};

export function stylesFor(type: DrinkType): Style[] {
  return STYLES_BY_TYPE[type];
}

export type NastawPlan = {
  method: "fermentacja" | "maceracja";
  waterL: number;
  targetAbv: number;
  sugarKg: number;
  fermentationDays: number;
  yeastType?: string;
  spiritL?: number;
  spiritType?: string;
};

/** Cukier (kg) potrzebny do osiągnięcia docelowego ABV z fermentacji. */
export function sugarForAbv(targetAbv: number, waterL: number): number {
  if (waterL <= 0 || targetAbv <= 0) return 0;
  const grams = targetAbv * SUGAR_G_PER_ABV_PER_L * waterL;
  return Math.round((grams / 1000) * 100) / 100;
}

/** Spirytus (l) potrzebny do osiągnięcia docelowego ABV w danej objętości nalewki. */
export function spiritForAbv(targetAbv: number, totalL: number): number {
  if (totalL <= 0 || targetAbv <= 0) return 0;
  const liters = (targetAbv * totalL) / SPIRIT_STRENGTH;
  return Math.round(liters * 10) / 10;
}

export function planNastaw(
  type: DrinkType,
  waterL: number,
  targetAbv: number,
): NastawPlan {
  const cfg = DRINK_TYPES[type];

  if (type === "nalewka") {
    return {
      method: "maceracja",
      waterL,
      targetAbv,
      sugarKg: Math.round(waterL * MACERATION_SUGAR_KG_PER_L * 100) / 100,
      spiritL: spiritForAbv(targetAbv, waterL),
      spiritType: `spirytus spożywczy ${SPIRIT_STRENGTH}%`,
      fermentationDays: cfg.days,
    };
  }

  return {
    method: "fermentacja",
    waterL,
    targetAbv,
    sugarKg: sugarForAbv(targetAbv, waterL),
    yeastType: cfg.yeast,
    fermentationDays: cfg.days,
  };
}
