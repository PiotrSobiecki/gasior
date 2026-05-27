import { actualAbv, actualAbvFromBrix } from "./density";
import type { Measurement } from "./api";

// Bierze pierwszy chronologicznie pomiar (OG) i ostatni (FG), zwraca realne ABV.
// Preferuje SG; jeśli oba pomiary mają Brix zamiast SG — używa Brix przez konwersję.
export function computeActualAbv(measurements: Measurement[]): number | null {
  if (measurements.length < 2) return null;

  const sorted = [...measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  const og = sorted[0];
  const fg = sorted[sorted.length - 1];

  if (og.sg != null && fg.sg != null) {
    return actualAbv(og.sg, fg.sg);
  }
  if (og.brix != null && fg.brix != null) {
    return actualAbvFromBrix(og.brix, fg.brix);
  }
  // Mieszane (jedno SG, drugie Brix) — konwertujemy Brix→SG po cichu.
  if (og.sg != null && fg.brix != null) {
    return actualAbvFromBrix(0, 0) === null
      ? null
      : actualAbv(og.sg, blgToSgSafe(fg.brix));
  }
  if (og.brix != null && fg.sg != null) {
    return actualAbv(blgToSgSafe(og.brix), fg.sg);
  }
  return null;
}

function blgToSgSafe(brix: number): number {
  // wewnętrzne — zakładamy że isValidBrix już sprawdzony przez wywołującego
  return 1 + brix / (258.6 - (brix / 258.2) * 227.1);
}
