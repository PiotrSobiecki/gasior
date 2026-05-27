import { describe, it, expect } from "vitest";
import { validatePhoto, MAX_PHOTO_BYTES } from "./photoValidation";

describe("validatePhoto", () => {
  it("akceptuje image/jpeg w limicie rozmiaru", () => {
    const r = validatePhoto({ contentType: "image/jpeg", sizeBytes: 1024 });
    expect(r.ok).toBe(true);
  });

  it("akceptuje image/png i image/webp", () => {
    expect(
      validatePhoto({ contentType: "image/png", sizeBytes: 500 }).ok,
    ).toBe(true);
    expect(
      validatePhoto({ contentType: "image/webp", sizeBytes: 500 }).ok,
    ).toBe(true);
  });

  it("odrzuca image/gif z czytelnym powodem", () => {
    const r = validatePhoto({ contentType: "image/gif", sizeBytes: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/typ|format/i);
  });

  it("odrzuca application/pdf", () => {
    const r = validatePhoto({
      contentType: "application/pdf",
      sizeBytes: 100,
    });
    expect(r.ok).toBe(false);
  });

  it("odrzuca pusty plik (0 bajtów)", () => {
    const r = validatePhoto({ contentType: "image/jpeg", sizeBytes: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/pusty|empty|0/i);
  });

  it("odrzuca plik powyżej MAX_PHOTO_BYTES", () => {
    const r = validatePhoto({
      contentType: "image/jpeg",
      sizeBytes: MAX_PHOTO_BYTES + 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/rozmiar|MB|duż/i);
  });

  it("akceptuje plik dokładnie na limicie", () => {
    const r = validatePhoto({
      contentType: "image/png",
      sizeBytes: MAX_PHOTO_BYTES,
    });
    expect(r.ok).toBe(true);
  });

  it("normalizuje contentType (case-insensitive, trim)", () => {
    expect(
      validatePhoto({ contentType: "Image/JPEG", sizeBytes: 100 }).ok,
    ).toBe(true);
    expect(
      validatePhoto({ contentType: " image/png ", sizeBytes: 100 }).ok,
    ).toBe(true);
  });

  it("odrzuca pusty contentType", () => {
    const r = validatePhoto({ contentType: "", sizeBytes: 100 });
    expect(r.ok).toBe(false);
  });
});
