import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { RecipeRepo } from "./repo";
import { filterRecipes, type RecipeQuery, type RecipeSort } from "./filter";
import {
  RECIPE_CATEGORIES,
  recipeInputSchema,
  type RecipeCategory,
} from "./validation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SORT_VALUES = new Set<RecipeSort>(["abv-asc", "abv-desc"]);
const CATEGORY_VALUES = new Set<string>(RECIPE_CATEGORIES);

function toNum(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Tłumaczy query string z URL na RecipeQuery; nieznane/niezdrowe wartości są
// po cichu pomijane — preferujemy puste wyniki nad 400 dla błahych literówek.
function parseListQuery(c: Context): RecipeQuery {
  const q = c.req.query();
  const category =
    q.category && CATEGORY_VALUES.has(q.category)
      ? (q.category as RecipeCategory)
      : undefined;
  const sort =
    q.sort && SORT_VALUES.has(q.sort as RecipeSort)
      ? (q.sort as RecipeSort)
      : undefined;
  return {
    fruit: q.fruit || undefined,
    category,
    minAbv: toNum(q.minAbv),
    maxAbv: toNum(q.maxAbv),
    q: q.q || undefined,
    sort,
  };
}

// Publiczne API receptur jest read-only — zapis idzie wyłącznie ścieżką importu
// (skrypt kuratora). getRepo wstrzykuje repo: produkcyjnie Neon, w testach in-memory.
export function createRecipesApp(getRepo: (c: Context) => RecipeRepo) {
  const app = new Hono();
  const createRecipeSchema = recipeInputSchema.omit({ status: true });

  app.get("/", async (c) => {
    const recipes = await getRepo(c).list();
    const filtered = filterRecipes(recipes, parseListQuery(c));
    return c.json(filtered);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    // Zniekształcone id nie może istnieć — nie odpytujemy bazy (uniknięcie błędu UUID).
    if (!UUID_RE.test(id))
      return c.json({ error: "Nie znaleziono receptury" }, 404);
    const recipe = await getRepo(c).getById(id);
    if (!recipe) return c.json({ error: "Nie znaleziono receptury" }, 404);
    return c.json(recipe);
  });

  app.post("/", zValidator("json", createRecipeSchema), async (c) => {
    const user = c.get("currentUser");
    if (!user) return c.json({ error: "Wymagane zalogowanie" }, 401);

    const input = c.req.valid("json");
    const created = await getRepo(c).create({ ...input, status: "draft" });
    return c.json(created, 201);
  });

  return app;
}
