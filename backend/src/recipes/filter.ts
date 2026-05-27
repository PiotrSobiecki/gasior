import type { Recipe } from "./repo";
import type { RecipeCategory } from "./validation";

export type RecipeSort = "abv-asc" | "abv-desc";

export type RecipeQuery = {
  fruit?: string;
  category?: RecipeCategory;
  minAbv?: number;
  maxAbv?: number;
  q?: string;
  sort?: RecipeSort;
};

export function filterRecipes(recipes: Recipe[], query: RecipeQuery): Recipe[] {
  let out = recipes;
  if (query.fruit) out = out.filter((r) => r.fruit === query.fruit);
  if (query.category) out = out.filter((r) => r.category === query.category);
  if (query.minAbv !== undefined)
    out = out.filter((r) => r.targetAbv >= query.minAbv!);
  if (query.maxAbv !== undefined)
    out = out.filter((r) => r.targetAbv <= query.maxAbv!);
  if (query.q) {
    const needle = query.q.toLowerCase();
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.fruit.toLowerCase().includes(needle),
    );
  }
  if (query.sort === "abv-asc")
    out = [...out].sort((a, b) => a.targetAbv - b.targetAbv);
  else if (query.sort === "abv-desc")
    out = [...out].sort((a, b) => b.targetAbv - a.targetAbv);
  return out;
}
