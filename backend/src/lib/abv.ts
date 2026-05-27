// Reguła kciuka: ~17 g cukru na litr brzeczki ≈ 1% ABV (potencjalny alkohol).
const SUGAR_G_PER_ABV_PER_L = 17;

/**
 * Szacuje potencjalne ABV z dodanego cukru i objętości.
 * Uwaga: nie uwzględnia cukru naturalnego z owoców (przybliżenie).
 */
export function estimateAbv(sugarKg: number, waterL: number): number {
  if (waterL <= 0) return 0;
  const sugarGramsPerLiter = (sugarKg * 1000) / waterL;
  return Number((sugarGramsPerLiter / SUGAR_G_PER_ABV_PER_L).toFixed(1));
}
