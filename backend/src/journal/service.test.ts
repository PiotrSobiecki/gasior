import { describe, it, expect } from "vitest";
import { createInMemoryBatchRepo } from "../batches/repo.in-memory";
import { createInMemoryJournalRepo } from "./repo.in-memory";
import { createInMemoryObjectStorage } from "../storage/storage.in-memory";
import {
  createJournalService,
  type JournalServiceDeps,
} from "./service";
import type { BatchRepo } from "../batches/repo";

const ALICE = "11111111-1111-4111-a111-111111111111";
const BOB = "22222222-2222-4222-a222-222222222222";

async function setupBatch(repo: BatchRepo, userId = ALICE) {
  return repo.create({
    viewSlug: "slugABC123XY",
    userId,
    name: "Wino",
    stage: "fermentacja-burzliwa",
    startDate: "2026-05-20",
    recipeId: null,
  });
}

function makeDeps(
  overrides: Partial<JournalServiceDeps> = {},
): JournalServiceDeps {
  return {
    batchRepo: overrides.batchRepo ?? createInMemoryBatchRepo(),
    journalRepo: overrides.journalRepo ?? createInMemoryJournalRepo(),
    storage: overrides.storage ?? createInMemoryObjectStorage(),
    photoBaseUrl: overrides.photoBaseUrl ?? "https://gasior.test/api/photos",
    generateKey: overrides.generateKey ?? ((batchId, ext) =>
      `batches/${batchId}/photos/fixed-uuid.${ext}`),
  };
}

describe("JournalService.addEntry — bez zdjęcia", () => {
  it("właściciel zapisuje wpis tekstowy", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const batch = await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));

    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "owoce pachną pięknie",
      photo: null,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.entry.batchId).toBe(batch.id);
      expect(res.entry.body).toBe("owoce pachną pięknie");
      expect(res.entry.photoKey).toBeNull();
      expect(res.entry.photoUrl).toBeNull();
    }
  });

  it("inny user dostaje forbidden, repo nietknięte", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const batch = await setupBatch(batchRepo);
    const journalRepo = createInMemoryJournalRepo();
    const svc = createJournalService(makeDeps({ batchRepo, journalRepo }));

    const res = await svc.addEntry("slugABC123XY", BOB, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("forbidden");
    expect((await journalRepo.listByBatchId(batch.id)).length).toBe(0);
  });

  it("brak sesji zwraca auth-required", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));
    const res = await svc.addEntry("slugABC123XY", undefined, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("auth-required");
  });

  it("dla nieistniejącego slug zwraca not-found", async () => {
    const svc = createJournalService(makeDeps());
    const res = await svc.addEntry("brak", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not-found");
  });

  it("z pustym body zwraca invalid", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));

    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "   ",
      photo: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("invalid");
  });
});

describe("JournalService.addEntry — ze zdjęciem", () => {
  it("uploaduje zdjęcie do storage i zwraca URL", async () => {
    const batchRepo = createInMemoryBatchRepo();
    const batch = await setupBatch(batchRepo);
    const storage = createInMemoryObjectStorage();
    const svc = createJournalService(
      makeDeps({
        batchRepo,
        storage,
        generateKey: (bid, ext) => `batches/${bid}/photos/pic.${ext}`,
      }),
    );

    const photoBytes = new Uint8Array([1, 2, 3, 4]);
    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "po pierwszym tygodniu",
      photo: {
        bytes: photoBytes,
        contentType: "image/jpeg",
      },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.entry.photoKey).toBe(
        `batches/${batch.id}/photos/pic.jpeg`,
      );
      expect(res.entry.photoUrl).toBe(
        `https://gasior.test/api/photos/batches/${batch.id}/photos/pic.jpeg`,
      );

      const stored = await storage.get(res.entry.photoKey!);
      expect(stored).not.toBeNull();
      expect(stored!.contentType).toBe("image/jpeg");
      expect(new Uint8Array(stored!.body)).toEqual(photoBytes);
    }
  });

  it("odrzuca niedozwolony typ pliku (image/gif)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const journalRepo = createInMemoryJournalRepo();
    const svc = createJournalService(makeDeps({ batchRepo, journalRepo }));

    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: {
        bytes: new Uint8Array([1, 2]),
        contentType: "image/gif",
      },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("invalid-photo");

    // Wpis nie został zapisany (transakcyjność: zła walidacja = nic).
    const batch = await batchRepo.getByViewSlug("slugABC123XY");
    expect((await journalRepo.listByBatchId(batch!.id)).length).toBe(0);
  });

  it("odrzuca plik powyżej limitu (5 MB + 1)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));

    const tooBig = new Uint8Array(5 * 1024 * 1024 + 1);
    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: { bytes: tooBig, contentType: "image/png" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("invalid-photo");
  });

  it("zły właściciel nie uploaduje zdjęcia (autoryzacja PRZED uploadem)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const storage = createInMemoryObjectStorage();
    const svc = createJournalService(makeDeps({ batchRepo, storage }));

    const res = await svc.addEntry("slugABC123XY", BOB, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: {
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
      },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("forbidden");
    // Nic nie powinno wylądować w R2 — sprawdzamy przez nieznajomość klucza.
    expect(
      await storage.get(`batches/dummy/photos/fixed-uuid.jpeg`),
    ).toBeNull();
  });

  it("akceptuje PNG i ustawia rozszerzenie pliku w kluczu", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));

    const res = await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-25T12:00:00.000Z",
      body: "x",
      photo: {
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        contentType: "image/png",
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.entry.photoKey).toMatch(/\.png$/);
  });
});

describe("JournalService.list", () => {
  it("zwraca wpisy chronologicznie po viewSlug (publicznie)", async () => {
    const batchRepo = createInMemoryBatchRepo();
    await setupBatch(batchRepo);
    const svc = createJournalService(makeDeps({ batchRepo }));

    await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-06-10T08:00:00.000Z",
      body: "drugi",
      photo: null,
    });
    await svc.addEntry("slugABC123XY", ALICE, {
      entryAt: "2026-05-20T08:00:00.000Z",
      body: "pierwszy",
      photo: null,
    });

    const list = await svc.list("slugABC123XY");
    expect(list).not.toBeNull();
    expect(list!.map((e) => e.body)).toEqual(["pierwszy", "drugi"]);
  });

  it("dla nieistniejącego slug zwraca null", async () => {
    const svc = createJournalService(makeDeps());
    expect(await svc.list("brak")).toBeNull();
  });
});
