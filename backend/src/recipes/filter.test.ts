import { describe, it, expect } from "vitest";
import { filterRecipes } from "./filter";
import type { Recipe } from "./repo";

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: crypto.randomUUID(),
    name: "Wino z aronii",
    fruit: "aronia",
    category: "wino",
    fruitKg: 2,
    sugarKg: 2.04,
    waterL: 10,
    yeastType: "drożdże winiarskie",
    targetAbv: 12,
    fermentationDays: 30,
    steps: ["Umyj sprzęt"],
    sourceUrls: ["https://example.com/aronia"],
    status: "validated",
    createdAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("filterRecipes", () => {
  it("returns only recipes matching the requested fruit", () => {
    const recipes = [
      makeRecipe({ fruit: "aronia" }),
      makeRecipe({ fruit: "wiśnia", category: "nalewka" }),
      makeRecipe({ fruit: "jabłko", category: "cydr" }),
    ];

    const result = filterRecipes(recipes, { fruit: "aronia" });

    expect(result).toHaveLength(1);
    expect(result[0].fruit).toBe("aronia");
  });

  it("filters recipes within the requested ABV range (inclusive on both ends)", () => {
    const recipes = [
      makeRecipe({ targetAbv: 5 }),
      makeRecipe({ targetAbv: 8 }),
      makeRecipe({ targetAbv: 12 }),
      makeRecipe({ targetAbv: 14 }),
      makeRecipe({ targetAbv: 18 }),
    ];

    const byAbv = (a: number, b: number) => a - b;

    const within = filterRecipes(recipes, { minAbv: 8, maxAbv: 14 });
    expect(within.map((r) => r.targetAbv).sort(byAbv)).toEqual([8, 12, 14]);

    const onlyMin = filterRecipes(recipes, { minAbv: 12 });
    expect(onlyMin.map((r) => r.targetAbv).sort(byAbv)).toEqual([12, 14, 18]);

    const onlyMax = filterRecipes(recipes, { maxAbv: 8 });
    expect(onlyMax.map((r) => r.targetAbv).sort(byAbv)).toEqual([5, 8]);
  });

  it("performs case-insensitive text search across name and fruit", () => {
    const recipes = [
      makeRecipe({ name: "Wino z aronii", fruit: "aronia" }),
      makeRecipe({ name: "Nalewka z wiśni", fruit: "wiśnia" }),
      makeRecipe({ name: "Cydr jabłkowy wytrawny", fruit: "jabłko" }),
      makeRecipe({ name: "Miód pitny malinowy", fruit: "malina" }),
    ];

    const byName = filterRecipes(recipes, { q: "WINO" });
    expect(byName.map((r) => r.name)).toEqual(["Wino z aronii"]);

    const byFruit = filterRecipes(recipes, { q: "Malina" });
    expect(byFruit.map((r) => r.name)).toEqual(["Miód pitny malinowy"]);

    // Diakrytyki muszą się zgadzać literalnie — Polish locale, prosty includes().
    const byFragment = filterRecipes(recipes, { q: "wiśn" });
    expect(byFragment.map((r) => r.name)).toEqual(["Nalewka z wiśni"]);
  });

  it("returns only recipes matching the requested category", () => {
    const recipes = [
      makeRecipe({ category: "wino" }),
      makeRecipe({ category: "nalewka", fruit: "wiśnia" }),
      makeRecipe({ category: "cydr", fruit: "jabłko" }),
      makeRecipe({ category: "miod", fruit: "malina" }),
    ];

    const result = filterRecipes(recipes, { category: "cydr" });

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("cydr");
  });

  it("combines filters with AND semantics", () => {
    const recipes = [
      makeRecipe({ name: "Wino z aronii", fruit: "aronia", category: "wino", targetAbv: 12 }),
      makeRecipe({ name: "Wino z jabłka", fruit: "jabłko", category: "wino", targetAbv: 11 }),
      makeRecipe({ name: "Nalewka z wiśni", fruit: "wiśnia", category: "nalewka", targetAbv: 14 }),
      makeRecipe({ name: "Wino musujące", fruit: "aronia", category: "wino", targetAbv: 6 }),
    ];

    const result = filterRecipes(recipes, {
      category: "wino",
      fruit: "aronia",
      minAbv: 10,
    });

    expect(result.map((r) => r.name)).toEqual(["Wino z aronii"]);
  });

  it("sorts by targetAbv ascending or descending", () => {
    const recipes = [
      makeRecipe({ name: "C", targetAbv: 12 }),
      makeRecipe({ name: "A", targetAbv: 5 }),
      makeRecipe({ name: "B", targetAbv: 8 }),
    ];

    const asc = filterRecipes(recipes, { sort: "abv-asc" });
    expect(asc.map((r) => r.name)).toEqual(["A", "B", "C"]);

    const desc = filterRecipes(recipes, { sort: "abv-desc" });
    expect(desc.map((r) => r.name)).toEqual(["C", "B", "A"]);
  });

  it("returns an empty array when nothing matches (not an error)", () => {
    const recipes = [makeRecipe({ fruit: "aronia" })];

    const result = filterRecipes(recipes, { fruit: "ananas" });

    expect(result).toEqual([]);
  });
});
