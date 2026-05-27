// Hashowanie haseł użytkowników (PBKDF2-SHA256 + sól per-user).
//
// Workers nie mają natywnego bcrypta, a paczki WASM/JS są wolne. Web Crypto
// PBKDF2 jest natywne i wystarczająco szybkie: 100k iteracji ≈ 100 ms na
// Workerze — to akceptowalny trade-off dla loginu (ten endpoint i tak chodzi
// rzadko), a kosztowne dla atakującego.
//
// Format wyjściowy: pbkdf2-sha256$<iter>$<salt-b64>$<hash-b64>
// (phc-podobny) — samodokumentujący się i pozwala w przyszłości podnieść
// iteracje bez migracji starych rekordów (verify czyta `iter` z hashu).

const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export interface HashOptions {
  // Override iteracji — przydatne w testach (wolny test PBKDF2 zabija DX).
  iterations?: number;
}

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa działa na ASCII; bytes mieszczą się 0..255, więc to bezpieczne.
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(
  password: string,
  opts: HashOptions = {},
): Promise<string> {
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS;
  const salt = getRandomBytes(SALT_BYTES);
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  // Każda nieoczekiwana postać hashu = "nie pasuje" (nie throw — uproszczona
  // ścieżka błędu dla wywołującego serwisu).
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;
  const [algo, iterStr, saltB64, hashB64] = parts;
  if (algo !== "pbkdf2-sha256") return false;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = base64ToBytes(saltB64);
    expected = base64ToBytes(hashB64);
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  const actual = await pbkdf2(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
