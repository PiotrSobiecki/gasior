// Port do przechowywania binarnych obiektów (głównie zdjęć).
//
// Dwie implementacje:
// - InMemoryObjectStorage — testy + lokalny dev (gdy brak R2 binding)
// - R2ObjectStorage       — produkcja (cienki adapter nad Cloudflare R2)

export type StoredObject = {
  body: ArrayBuffer;
  contentType: string;
};

export interface ObjectStorage {
  put(key: string, body: ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
