import { describe, it, expect } from "vitest";
import type { Recipe } from "./api";
import {
  alignPlan,
  buildAlignedPlan,
  buildWizardSteps,
  filterSimilarRecipes,
} from "./recipeAlignment";
import { planNastaw } from "./calc";

function recipe(partial: Partial<Recipe> & Pick<Recipe, "name" | "fruit" | "category">): Recipe {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    fruitKg: 2,
    sugarKg: 2,
    waterL: 10,
    yeastType: "drożdże winiarskie",
    targetAbv: 12,
    fermentationDays: 30,
    steps: ["krok 1", "krok 2", "krok 3", "krok 4"],
    sourceUrls: [],
    status: "validated",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("filterSimilarRecipes", () => {
  const list = [
    recipe({ name: "Wino malina A", fruit: "malina", category: "wino", targetAbv: 11 }),
    recipe({ name: "Wino malina B", fruit: "malina", category: "wino", targetAbv: 13, status: "draft" }),
    recipe({ name: "Wino aronia", fruit: "aronia", category: "wino" }),
    recipe({ name: "Nalewka malina", fruit: "malina", category: "nalewka" }),
  ];

  it("filtruje po owocu i kategorii, validated na początku", () => {
    const out = filterSimilarRecipes(list, "wino", "malina", 12);
    expect(out.map((r) => r.name)).toEqual([
      "Wino malina A",
      "Wino malina B",
    ]);
  });

  it("dopasowuje ogólne „porzeczka” do „czarna porzeczka” w bazie", () => {
    const list = [
      recipe({
        name: "Czarna",
        fruit: "czarna porzeczka",
        category: "wino",
      }),
    ];
    expect(filterSimilarRecipes(list, "wino", "porzeczka")).toHaveLength(1);
  });
});

describe("buildAlignedPlan", () => {
  it("koryguje cukier i owoce w stronę mediany z receptur", () => {
    const list = [
      recipe({
        name: "A",
        fruit: "aronia",
        category: "wino",
        fruitKg: 2,
        sugarKg: 2.04,
        waterL: 10,
        fermentationDays: 30,
      }),
      recipe({
        name: "B",
        fruit: "aronia",
        category: "wino",
        fruitKg: 2.5,
        sugarKg: 2.5,
        waterL: 10,
        fermentationDays: 32,
      }),
    ];

    const aligned = buildAlignedPlan("wino", "aronia", 10, 12, list);
    const pure = planNastaw("wino", 10, 12);

    expect(aligned.alignedFromRecipes).toBe(true);
    expect(aligned.fruitKg).toBe(2.25);
    expect(aligned.sugarKg).not.toBe(pure.sugarKg);
    expect(aligned.fermentationDays).toBe(31);
  });

  it("bez dopasowań zostaje czysty wzór", () => {
    const aligned = buildAlignedPlan("wino", "pigwa", 10, 12, []);
    expect(aligned.alignedFromRecipes).toBe(false);
    expect(aligned).toMatchObject(planNastaw("wino", 10, 12));
  });
});

describe("buildWizardSteps", () => {
  it("bierze kroki z receptury gdy są wystarczająco szczegółowe", () => {
    const steps = [
      "sanitacja",
      "owoce",
      "cukier",
      "fermentacja",
      "zlew",
      "butelki",
    ];
    const list = [
      recipe({
        name: "Wino z malin",
        fruit: "malina",
        category: "wino",
        steps,
      }),
    ];

    const result = buildWizardSteps(
      { type: "wino", fruit: "malina", waterL: 10, targetAbv: 12 },
      list,
    );

    expect(result.source).toBe("recipe");
    expect(result.steps).toEqual(steps);
    expect(result.referenceRecipeName).toBe("Wino z malin");
  });

  it("wraca do szablonu gdy brak podobnych receptur", () => {
    const result = buildWizardSteps(
      { type: "cydr", fruit: "jabłko", waterL: 10, targetAbv: 6 },
      [],
    );
    expect(result.source).toBe("template");
    expect(result.steps.length).toBeGreaterThanOrEqual(6);
  });
});

describe("alignPlan", () => {
  it("ustawia yeastType z receptury referencyjnej", () => {
    const base = planNastaw("wino", 10, 12);
    const similar = [
      recipe({
        name: "Ref",
        fruit: "malina",
        category: "wino",
        yeastType: "Malaga z pożywką",
      }),
    ];
    const aligned = alignPlan(base, similar, 10, "wino");
    expect(aligned.yeastType).toBe("Malaga z pożywką");
  });
});
