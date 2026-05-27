import type { ObjectStorage, StoredObject } from "./storage";

// Mapa key→{body, contentType}. Body trzymane jako ArrayBuffer dla spójności
// z R2 (które też zwraca ArrayBuffer / ReadableStream).
export function createInMemoryObjectStorage(): ObjectStorage {
  const store = new Map<string, StoredObject>();
  return {
    async put(key, body, contentType) {
      const buf = body instanceof Uint8Array ? body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      ) : body;
      store.set(key, { body: buf as ArrayBuffer, contentType });
    },
    async get(key) {
      return store.get(key) ?? null;
    },
    async delete(key) {
      store.delete(key);
    },
  };
}
