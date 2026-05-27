import { asc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { journalEntries } from "../db/schema";
import type { JournalEntry, JournalRepo } from "./repo";

type Row = typeof journalEntries.$inferSelect;

const toEntry = (row: Row): JournalEntry => ({
  id: row.id,
  batchId: row.batchId,
  entryAt: row.entryAt.toISOString(),
  body: row.body,
  photoKey: row.photoKey,
  photoUrl: row.photoUrl,
  createdAt: row.createdAt.toISOString(),
});

export function createNeonJournalRepo(databaseUrl: string): JournalRepo {
  const db = getDb(databaseUrl);
  return {
    async create(input) {
      const [row] = await db
        .insert(journalEntries)
        .values({
          batchId: input.batchId,
          entryAt: new Date(input.entryAt),
          body: input.body,
          photoKey: input.photoKey,
          photoUrl: input.photoUrl,
        })
        .returning();
      return toEntry(row);
    },
    async listByBatchId(batchId) {
      const rows = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.batchId, batchId))
        .orderBy(asc(journalEntries.entryAt));
      return rows.map(toEntry);
    },
  };
}
