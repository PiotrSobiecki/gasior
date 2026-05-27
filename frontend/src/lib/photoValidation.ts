// Lustrzana wersja backendowego photoValidation — używana w UI do wczesnej
// walidacji przed uploadem (uniknięcie niepotrzebnego POST przy zbyt dużym
// pliku lub złym typie). Backend powtarza walidację — single source of truth.

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
    return { ok: false, reason: "Brak typu pliku" };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(ct as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return {
      ok: false,
      reason: `Niedozwolony typ pliku (${ct}). Akceptujemy: JPEG, PNG, WebP`,
    };
  }
  if (meta.sizeBytes <= 0) {
    return { ok: false, reason: "Pusty plik" };
  }
  if (meta.sizeBytes > MAX_PHOTO_BYTES) {
    return { ok: false, reason: `Plik za duży — limit to 5 MB` };
  }
  return {
    ok: true,
    contentType: ct as (typeof ALLOWED_PHOTO_TYPES)[number],
  };
}
