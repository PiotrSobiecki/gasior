import type { BatchRepo } from "../batches/repo";
import type { ObjectStorage } from "../storage/storage";
import {
  validatePhoto,
  type PhotoValidationResult,
} from "../storage/photoValidation";
import type { JournalEntry, JournalRepo } from "./repo";

export type PhotoUpload = {
  bytes: Uint8Array;
  contentType: string;
};

export type AddEntryInput = {
  entryAt: string;
  body: string;
  photo: PhotoUpload | null;
};

export type AddEntryResult =
  | { ok: true; entry: JournalEntry }
  | {
      ok: false;
      reason:
        | "not-found"
        | "auth-required"
        | "forbidden"
        | "invalid"
        | "invalid-photo";
      message?: string;
    };

export type JournalServiceDeps = {
  batchRepo: BatchRepo;
  journalRepo: JournalRepo;
  storage: ObjectStorage;
  // Bazowy URL do serwowania zdjęć (np. https://api.../api/photos).
  // Klucz jest dopisywany jako `${photoBaseUrl}/${key}`.
  photoBaseUrl: string;
  // Generator klucza obiektu w storage. ext bez kropki (np. "jpeg").
  generateKey: (batchId: string, ext: string) => string;
};

export interface JournalService {
  // actorUserId === undefined → niezalogowany → auth-required dla nie-demo.
  addEntry(
    viewSlug: string,
    actorUserId: string | undefined,
    input: AddEntryInput,
  ): Promise<AddEntryResult>;
  list(viewSlug: string): Promise<JournalEntry[] | null>;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function createJournalService(deps: JournalServiceDeps): JournalService {
  return {
    async addEntry(viewSlug, actorUserId, input) {
      const batch = await deps.batchRepo.getByViewSlug(viewSlug);
      if (!batch) return { ok: false, reason: "not-found" };

      if (!batch.isDemo) {
        if (actorUserId === undefined) {
          return { ok: false, reason: "auth-required" };
        }
        if (actorUserId !== batch.userId) {
          return { ok: false, reason: "forbidden" };
        }
      }

      const body = input.body.trim();
      if (body.length === 0) {
        return { ok: false, reason: "invalid", message: "Treść jest wymagana" };
      }

      let photoKey: string | null = null;
      let photoUrl: string | null = null;
      if (input.photo) {
        const v: PhotoValidationResult = validatePhoto({
          contentType: input.photo.contentType,
          sizeBytes: input.photo.bytes.byteLength,
        });
        if (!v.ok) {
          return { ok: false, reason: "invalid-photo", message: v.reason };
        }
        const ext = extensionFor(v.contentType);
        photoKey = deps.generateKey(batch.id, ext);
        await deps.storage.put(photoKey, input.photo.bytes, v.contentType);
        photoUrl = `${deps.photoBaseUrl}/${photoKey}`;
      }

      const entry = await deps.journalRepo.create({
        batchId: batch.id,
        entryAt: input.entryAt,
        body,
        photoKey,
        photoUrl,
      });
      return { ok: true, entry };
    },

    async list(viewSlug) {
      const batch = await deps.batchRepo.getByViewSlug(viewSlug);
      if (!batch) return null;
      return deps.journalRepo.listByBatchId(batch.id);
    },
  };
}
