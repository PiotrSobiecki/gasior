import type { JournalEntry, JournalEntryInput, JournalRepo } from "./repo";

export function createInMemoryJournalRepo(
  initial: JournalEntry[] = [],
): JournalRepo {
  const entries = [...initial];
  return {
    async create(input: JournalEntryInput) {
      const e: JournalEntry = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      entries.push(e);
      return e;
    },
    async listByBatchId(batchId) {
      return entries
        .filter((e) => e.batchId === batchId)
        .slice()
        .sort((a, b) => a.entryAt.localeCompare(b.entryAt));
    },
  };
}
