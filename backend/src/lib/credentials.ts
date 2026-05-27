// Generator viewSlug — krótki, URL-safe identyfikator publiczny nastawu
// (12 znaków). Po przejściu na konta editCode zniknął; została tylko
// publiczna część "tu znajdziesz mój nastaw".

const VIEW_SLUG_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const VIEW_SLUG_LENGTH = 12;

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

export function generateViewSlug(): string {
  const alphabetLen = VIEW_SLUG_ALPHABET.length;
  // Rejection sampling: bierzemy bajt tylko jeśli mieści się w pełnym
  // wielokrotnościowym zakresie [0, floor(256/alphabetLen)*alphabetLen),
  // żeby rozkład pozostał równomierny.
  const acceptanceCutoff = Math.floor(256 / alphabetLen) * alphabetLen;
  let result = "";
  while (result.length < VIEW_SLUG_LENGTH) {
    const need = VIEW_SLUG_LENGTH - result.length;
    const bytes = getRandomBytes(need * 2);
    for (let i = 0; i < bytes.length && result.length < VIEW_SLUG_LENGTH; i++) {
      const b = bytes[i];
      if (b < acceptanceCutoff) {
        result += VIEW_SLUG_ALPHABET[b % alphabetLen];
      }
    }
  }
  return result;
}
