// Kalkulator gęstości i realnego ABV.
//
// Wzory:
// - Realne ABV (winiarstwo domowe):     ABV ≈ (OG − FG) × 131.25
// - Blg/Brix → SG (ASBC, kwadratowy):   SG ≈ 1 + (Blg / (258.6 − (Blg/258.2)*227.1))
// - SG → Blg (Plato, kwadratowy):        Blg ≈ -1*616.868 + 1111.14*SG - 630.272*SG² + 135.997*SG³
//
// Zwracamy null zamiast rzucać wyjątek dla niepoprawnych odczytów — interfejs
// kalkulatora jest bezpieczny dla niepełnych danych z formularza.

function isValidSg(sg: number): boolean {
  return Number.isFinite(sg) && sg > 0.9 && sg < 1.5;
}

function isValidBrix(brix: number): boolean {
  return Number.isFinite(brix) && brix >= 0 && brix < 50;
}

export function blgToSg(brix: number): number {
  if (!isValidBrix(brix)) return NaN;
  return 1 + brix / (258.6 - (brix / 258.2) * 227.1);
}

export function sgToBlg(sg: number): number {
  if (!isValidSg(sg)) return NaN;
  return -1 * 616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function actualAbv(og: number, fg: number): number | null {
  if (!isValidSg(og) || !isValidSg(fg)) return null;
  if (fg > og) return null;
  return round1((og - fg) * 131.25);
}

export function actualAbvFromBrix(
  ogBrix: number,
  fgBrix: number,
): number | null {
  if (!isValidBrix(ogBrix) || !isValidBrix(fgBrix)) return null;
  if (fgBrix > ogBrix) return null;
  return actualAbv(blgToSg(ogBrix), blgToSg(fgBrix));
}
