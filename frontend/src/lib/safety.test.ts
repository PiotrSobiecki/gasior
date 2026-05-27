import { describe, it, expect } from "vitest";
import { safetyWarnings } from "./safety";
import type { Recipe } from "./api";

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Wino z aronii",
    fruit: "aronia",
    category: "wino",
    fruitKg: 2,
    sugarKg: 2.04,
    waterL: 10,
    yeastType: "drożdże winiarskie",
    targetAbv: 12,
    fermentationDays: 30,
    steps: ["Umyj sprzęt", "Rozgnieć owoce"],
    sourceUrls: ["https://example.com/aronia"],
    status: "validated",
    createdAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("safetyWarnings", () => {
  it("returns no warnings for a safe recipe (sanitized, non-stone fruit)", () => {
    expect(safetyWarnings(makeRecipe())).toEqual([]);
  });

  it("warns about pits for stone-fruit recipes without a pit instruction", () => {
    const result = safetyWarnings(
      makeRecipe({
        fruit: "wiśnia",
        category: "nalewka",
        steps: ["Umyj sprzęt", "Rozgnieć wiśnie razem ze skórką"],
      }),
    );

    expect(result.some((w) => /pestk|amigdalin/i.test(w.message))).toBe(true);
  });

  it("does not warn about pits when steps explicitly mention drylowanie", () => {
    const result = safetyWarnings(
      makeRecipe({
        fruit: "wiśnia",
        category: "nalewka",
        steps: ["Umyj sprzęt", "Wydryluj wiśnie — nie rozgniataj pestek"],
      }),
    );

    expect(result.some((w) => /pestk|amigdalin/i.test(w.message))).toBe(false);
  });

  it("warns when steps lack any sanitation instruction", () => {
    const result = safetyWarnings(
      makeRecipe({ steps: ["Rozgnieć owoce", "Dodaj cukier"] }),
    );

    expect(result.some((w) => /sanit|dezynfek|wyparz/i.test(w.message))).toBe(
      true,
    );
  });
});
