import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { recipes } from "../db/schema";
import type { Recipe, RecipeRepo } from "./repo";

type Row = typeof recipes.$inferSelect;

const toRecipe = (row: Row): Recipe => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

// Produkcyjna implementacja RecipeRepo na Neon (Postgres) przez Drizzle.
export function createNeonRecipeRepo(databaseUrl: string): RecipeRepo {
  const db = getDb(databaseUrl);
  return {
    async list() {
      const rows = await db.select().from(recipes);
      return rows.map(toRecipe);
    },
    async getById(id) {
      const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
      return row ? toRecipe(row) : null;
    },
    async create(input) {
      const [row] = await db.insert(recipes).values(input).returning();
      return toRecipe(row);
    },
    async update(id, input) {
      const [row] = await db
        .update(recipes)
        .set(input)
        .where(eq(recipes.id, id))
        .returning();
      return row ? toRecipe(row) : null;
    },
    async delete(id) {
      const rows = await db
        .delete(recipes)
        .where(eq(recipes.id, id))
        .returning();
      return rows.length > 0;
    },
  };
}
