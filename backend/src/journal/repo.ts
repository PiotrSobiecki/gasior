export type JournalEntry = {
  id: string;
  batchId: string;
  entryAt: string; // ISO timestamp
  body: string;
  photoKey: string | null;
  photoUrl: string | null;
  createdAt: string;
};

export type JournalEntryInput = {
  batchId: string;
  entryAt: string;
  body: string;
  photoKey: string | null;
  photoUrl: string | null;
};

export interface JournalRepo {
  create(input: JournalEntryInput): Promise<JournalEntry>;
  listByBatchId(batchId: string): Promise<JournalEntry[]>;
}
