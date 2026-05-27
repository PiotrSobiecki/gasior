import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { batches } from "../db/schema";
import type { Batch, BatchRepo } from "./repo";

type Row = typeof batches.$inferSelect;

const toBatch = (row: Row): Batch => ({
  id: row.id,
  viewSlug: row.viewSlug,
  userId: row.userId,
  name: row.name,
  stage: row.stage,
  startDate: row.startDate,
  recipeId: row.recipeId,
  isDemo: row.isDemo,
  instructionSteps: row.instructionSteps ?? [],
  checkedStepIndices: row.checkedStepIndices ?? [],
  createdAt: row.createdAt.toISOString(),
});

// Produkcyjna implementacja BatchRepo na Neon (Postgres) przez Drizzle.
export function createNeonBatchRepo(databaseUrl: string): BatchRepo {
  const db = getDb(databaseUrl);
  return {
    async create(input) {
      const [row] = await db.insert(batches).values(input).returning();
      return toBatch(row);
    },
    async getByViewSlug(viewSlug) {
      const [row] = await db
        .select()
        .from(batches)
        .where(eq(batches.viewSlug, viewSlug));
      return row ? toBatch(row) : null;
    },
    async listByUserId(userId) {
      const rows = await db
        .select()
        .from(batches)
        .where(eq(batches.userId, userId))
        .orderBy(desc(batches.createdAt));
      return rows.map(toBatch);
    },
    async updateByViewSlug(viewSlug, patch) {
      const updateData: Partial<typeof batches.$inferInsert> = {};
      if (patch.stage !== undefined) updateData.stage = patch.stage;
      if (patch.startDate !== undefined) updateData.startDate = patch.startDate;
      if (patch.checkedStepIndices !== undefined) {
        updateData.checkedStepIndices = patch.checkedStepIndices;
      }
      if (Object.keys(updateData).length === 0) {
        return this.getByViewSlug(viewSlug);
      }
      const [row] = await db
        .update(batches)
        .set(updateData)
        .where(eq(batches.viewSlug, viewSlug))
        .returning();
      return row ? toBatch(row) : null;
    },
    async setDemoByViewSlug(viewSlug, isDemo) {
      const [row] = await db
        .update(batches)
        .set({ isDemo })
        .where(eq(batches.viewSlug, viewSlug))
        .returning();
      return row ? toBatch(row) : null;
    },
  };
}
