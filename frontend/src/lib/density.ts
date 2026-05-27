// Frontend port wzorów gęstości (źródło prawdy: backend/src/lib/density.ts).
// Duplikujemy 1-linerowe wzory, żeby frontend mógł liczyć realne ABV bez
// dodatkowego roundtripu do API.

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
