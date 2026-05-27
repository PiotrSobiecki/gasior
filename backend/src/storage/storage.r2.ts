import type { ObjectStorage } from "./storage";

// Cienki adapter nad Cloudflare R2 (R2Bucket binding z env).
// R2Bucket pochodzi z @cloudflare/workers-types.
type R2Bucket = {
  put(
    key: string,
    body: ArrayBuffer | Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{
    arrayBuffer(): Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
};

export function createR2ObjectStorage(bucket: R2Bucket): ObjectStorage {
  return {
    async put(key, body, contentType) {
      await bucket.put(key, body, { httpMetadata: { contentType } });
    },
    async get(key) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      const body = await obj.arrayBuffer();
      return {
        body,
        contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
      };
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
