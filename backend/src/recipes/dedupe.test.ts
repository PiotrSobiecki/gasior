import { describe, it, expect } from "vitest";
import { planDedupe } from "./dedupe";
import type { Recipe } from "./repo";

function makeRecipe(over: Partial<Recipe>): Recipe {
  return {
    id: crypto.randomUUID(),
    name: "Wino z aronii",
    fruit: "aronia",
    category: "wino",
    fruitKg: 4,
    sugarKg: 2,
    waterL: 8,
    yeastType: "Wine S",
    targetAbv: 12,
    fermentationDays: 14,
    steps: ["umyj", "zasyp"],
    sourceUrls: ["https://example.org"],
    status: "validated",
    createdAt: "2026-05-25T18:00:00.000Z",
    ...over,
  };
}

describe("planDedupe", () => {
  it("zwraca pustą listę gdy brak duplikatów", () => {
    const recipes = [
      makeRecipe({ id: "a", name: "Wino z aronii" }),
      makeRecipe({ id: "b", name: "Nalewka z wiśni", fruit: "wiśnia", category: "nalewka" }),
    ];
    expect(planDedupe(recipes).groups).toEqual([]);
    expect(planDedupe(recipes).toDeleteCount).toBe(0);
  });

  it("grupuje rekordy o identycznych parametrach (case-insensitive po nazwie/owocu/drożdżach)", () => {
    const recipes = [
      makeRecipe({ id: "a", name: "Wino z aronii", createdAt: "2026-01-01T00:00:00Z" }),
      makeRecipe({ id: "b", name: "  WINO Z ARONII  ", createdAt: "2026-02-01T00:00:00Z" }),
      makeRecipe({ id: "c", name: "wino z aronii", createdAt: "2026-03-01T00:00:00Z" }),
    ];
    const plan = planDedupe(recipes);
    expect(plan.groups).toHaveLength(1);
    expect(plan.toDeleteCount).toBe(2);
    expect(plan.groups[0].keep.id).toBe("a");
    expect(plan.groups[0].drop.map((r) => r.id).sort()).toEqual(["b", "c"]);
  });

  it("preferuje validated nad draftem przy wyborze 'keep'", () => {
    const recipes = [
      makeRecipe({ id: "a", status: "draft", createdAt: "2026-01-01T00:00:00Z" }),
      makeRecipe({ id: "b", status: "validated", createdAt: "2026-02-01T00:00:00Z" }),
    ];
    const plan = planDedupe(recipes);
    expect(plan.groups[0].keep.id).toBe("b");
    expect(plan.groups[0].drop[0].id).toBe("a");
  });

  it("przy tej samej kategorii statusu zostawia najstarszą po createdAt", () => {
    const recipes = [
      makeRecipe({ id: "newer", createdAt: "2026-03-01T00:00:00Z" }),
      makeRecipe({ id: "older", createdAt: "2026-01-01T00:00:00Z" }),
      makeRecipe({ id: "middle", createdAt: "2026-02-01T00:00:00Z" }),
    ];
    const plan = planDedupe(recipes);
    expect(plan.groups[0].keep.id).toBe("older");
    expect(plan.groups[0].drop.map((r) => r.id).sort()).toEqual([
      "middle",
      "newer",
    ]);
  });

  it("NIE traktuje jako duplikat receptur o innych liczbach (różny sugarKg)", () => {
    const recipes = [
      makeRecipe({ id: "a", sugarKg: 2 }),
      makeRecipe({ id: "b", sugarKg: 2.5 }),
    ];
    expect(planDedupe(recipes).groups).toEqual([]);
  });

  it("NIE traktuje jako duplikat receptur o innej kategorii (wino vs nalewka)", () => {
    const recipes = [
      makeRecipe({ id: "a", category: "wino" }),
      makeRecipe({ id: "b", category: "nalewka" }),
    ];
    expect(planDedupe(recipes).groups).toEqual([]);
  });

  it("ignoruje różnice w steps / sourceUrls (to nie są pola identyfikujące)", () => {
    const recipes = [
      makeRecipe({
        id: "a",
        steps: ["umyj"],
        sourceUrls: ["https://a.example"],
      }),
      makeRecipe({
        id: "b",
        steps: ["umyj", "dodaj cukier"],
        sourceUrls: ["https://b.example"],
      }),
    ];
    const plan = planDedupe(recipes);
    expect(plan.groups).toHaveLength(1);
    expect(plan.toDeleteCount).toBe(1);
  });
});
