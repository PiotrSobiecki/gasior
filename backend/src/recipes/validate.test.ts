import { describe, it, expect } from "vitest";
import { validateRecipe } from "./validate";
import type { RecipeInput } from "./repo";

const balanced: RecipeInput = {
  name: "Wino z aronii",
  fruit: "aronia",
  category: "wino",
  fruitKg: 2,
  sugarKg: 2.04, // 204 g/l ÷ 17 ≈ 12% ABV — dokładnie target
  waterL: 10,
  yeastType: "drożdże winiarskie",
  targetAbv: 12,
  fermentationDays: 30,
  steps: ["Umyj i zdezynfekuj sprzęt", "Rozgnieć owoce"],
  sourceUrls: ["https://example.com/aronia"],
  status: "validated",
};

describe("validateRecipe", () => {
  it("passes a balanced recipe with matching ABV and sanitation step", () => {
    const result = validateRecipe(balanced);

    expect(result.verdict).toBe("pass");
    expect(result.abvCheck.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("warns when computed ABV diverges from declared by more than 1.5", () => {
    // sugar 1 kg w 10 l → 100 g/l → ~5.9% ABV, declared 12 → delta ~6
    const result = validateRecipe({ ...balanced, sugarKg: 1 });

    expect(result.verdict).toBe("warn");
    expect(result.abvCheck.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "sugarKg", severity: "medium" }),
    );
  });

  it("warns when target ABV exceeds typical yeast tolerance (>18%)", () => {
    // 19% × 17 g/l × 10 l = 3230 g → 3.23 kg → spójne z target, ale za mocne dla drożdży
    const result = validateRecipe({
      ...balanced,
      sugarKg: 3.23,
      targetAbv: 19,
    });

    expect(result.verdict).toBe("warn");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "yeastType" }),
    );
  });

  it("fails when target ABV exceeds fermentation ceiling (>20%)", () => {
    // 21% × 17 g/l × 10 l = 3570 g → 3.57 kg cukru
    const result = validateRecipe({
      ...balanced,
      sugarKg: 3.57,
      targetAbv: 21,
    });

    expect(result.verdict).toBe("fail");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "targetAbv", severity: "high" }),
    );
  });

  it("warns when steps lack any sanitation cue", () => {
    const result = validateRecipe({
      ...balanced,
      steps: ["Rozgnieć owoce", "Dodaj cukier", "Zalej wodą"],
    });

    expect(result.verdict).toBe("warn");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "steps" }),
    );
  });

  it("flags a stone fruit recipe that doesn't mention seeds", () => {
    const result = validateRecipe({
      ...balanced,
      fruit: "śliwka",
      steps: ["Umyj sprzęt", "Rozgnieć owoce ze skórką", "Dodaj drożdże"],
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "fruit", severity: "high" }),
    );
  });

  it("does not check ABV math nor ceiling for nalewka (maceracja w alkoholu bazowym)", () => {
    // Nalewka na spirytusie: 1 kg owoców, 0 cukru, 0 wody, ABV 45% — typowa
    // realność, fermentacja tu nie zachodzi. Walidator powinien dać pass
    // (przy spełnionych pozostałych warunkach).
    const result = validateRecipe({
      ...balanced,
      category: "nalewka",
      fruit: "malina",
      sugarKg: 0,
      waterL: 0,
      targetAbv: 45,
      yeastType: "brak (maceracja w spirytusie 70%)",
      steps: ["Umyj słoik i wyparzyć", "Zasyp maliny cukrem, zalej spirytusem"],
    });

    expect(result.verdict).toBe("pass");
    expect(result.issues.filter((i) => i.field === "targetAbv")).toHaveLength(0);
    expect(result.issues.filter((i) => i.field === "yeastType")).toHaveLength(0);
    expect(result.issues.filter((i) => i.field === "sugarKg")).toHaveLength(0);
  });

  it("does not flag stone fruit when seeds are explicitly mentioned", () => {
    const result = validateRecipe({
      ...balanced,
      fruit: "wiśnia",
      steps: [
        "Umyj sprzęt",
        "Wydryluj wiśnie — nie rozgniataj pestek (amigdalina)",
      ],
    });

    expect(
      result.issues.filter((i) => i.field === "fruit"),
    ).toHaveLength(0);
  });
});
