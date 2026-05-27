// Walidacja uploadu zdjęcia. Czysta funkcja — używana po obu stronach
// (backend → 400 przy żądaniu; frontend → wczesny komunikat przed POST).

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoMeta = {
  contentType: string;
  sizeBytes: number;
};

export type PhotoValidationResult =
  | { ok: true; contentType: (typeof ALLOWED_PHOTO_TYPES)[number] }
  | { ok: false; reason: string };

export function validatePhoto(meta: PhotoMeta): PhotoValidationResult {
  const ct = meta.contentType.trim().toLowerCase();
  if (ct.length === 0) {
    return { ok: false, reason: "Brak typu pliku (Content-Type)" };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(ct as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return {
      ok: false,
      reason: `Niedozwolony typ pliku (${ct}). Akceptujemy: ${ALLOWED_PHOTO_TYPES.join(", ")}`,
    };
  }
  if (meta.sizeBytes <= 0) {
    return { ok: false, reason: "Pusty plik (0 bajtów)" };
  }
  if (meta.sizeBytes > MAX_PHOTO_BYTES) {
    const mb = (MAX_PHOTO_BYTES / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      reason: `Plik za duży — limit to ${mb} MB`,
    };
  }
  return {
    ok: true,
    contentType: ct as (typeof ALLOWED_PHOTO_TYPES)[number],
  };
}
