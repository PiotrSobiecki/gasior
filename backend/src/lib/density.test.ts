import { describe, it, expect } from "vitest";
import {
  actualAbv,
  actualAbvFromBrix,
  blgToSg,
  sgToBlg,
} from "./density";

// Wszystkie wartości referencyjne dla typowych nastawów domowych (5–25 Blg,
// 1.020–1.110 SG). Tolerancja w testach: 0.001 SG i 0.05 Blg
// (precyzja domowych refraktometrów i areometrów).

describe("blgToSg / sgToBlg (ASBC)", () => {
  it("blgToSg(0) ≈ 1.000 (czysta woda)", () => {
    expect(blgToSg(0)).toBeCloseTo(1.0, 3);
  });

  it("blgToSg(10) ≈ 1.040", () => {
    expect(blgToSg(10)).toBeCloseTo(1.04, 2);
  });

  it("blgToSg(20) ≈ 1.083", () => {
    expect(blgToSg(20)).toBeCloseTo(1.083, 2);
  });

  it("sgToBlg(1.000) ≈ 0", () => {
    expect(sgToBlg(1.0)).toBeCloseTo(0, 1);
  });

  it("sgToBlg(1.040) ≈ 10", () => {
    expect(sgToBlg(1.04)).toBeCloseTo(10, 1);
  });

  it("round-trip: sgToBlg(blgToSg(x)) ≈ x dla typowego zakresu", () => {
    for (const blg of [5, 10, 15, 20]) {
      expect(sgToBlg(blgToSg(blg))).toBeCloseTo(blg, 1);
    }
  });
});

describe("actualAbv(og, fg)", () => {
  it("standardowy wzór: (og - fg) * 131.25", () => {
    // OG 1.090, FG 1.000 → 11.81 %
    expect(actualAbv(1.09, 1.0)).toBeCloseTo(11.81, 1);
  });

  it("OG 1.060 / FG 0.995 → ok. 8.5%", () => {
    expect(actualAbv(1.06, 0.995)).toBeCloseTo(8.5, 1);
  });

  it("zaokrąglone do 1 miejsca po przecinku", () => {
    const result = actualAbv(1.05, 1.005);
    expect(result).toBeTypeOf("number");
    // 0.045 * 131.25 = 5.90625 → 5.9
    expect(result).toBe(5.9);
  });

  it("zwraca null gdy fg > og (fermentacja jeszcze nie ruszyła)", () => {
    expect(actualAbv(1.0, 1.05)).toBeNull();
  });

  it("zwraca null dla NaN", () => {
    expect(actualAbv(NaN, 1.0)).toBeNull();
    expect(actualAbv(1.05, NaN)).toBeNull();
  });

  it("zwraca null dla zer/ujemnych (poza realnym zakresem SG)", () => {
    expect(actualAbv(0, 0)).toBeNull();
    expect(actualAbv(-1, 1.0)).toBeNull();
  });

  it("zwraca 0 gdy og == fg (brak fermentacji)", () => {
    expect(actualAbv(1.05, 1.05)).toBe(0);
  });
});

describe("actualAbvFromBrix(ogBrix, fgBrix)", () => {
  it("12 Blg → 4 Blg ≈ ok 4-5%", () => {
    const result = actualAbvFromBrix(12, 4);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(3);
    expect(result!).toBeLessThan(6);
  });

  it("zwraca null dla NaN", () => {
    expect(actualAbvFromBrix(NaN, 4)).toBeNull();
  });

  it("zwraca null gdy fg > og", () => {
    expect(actualAbvFromBrix(4, 12)).toBeNull();
  });
});
