import { describe, it, expect } from "vitest";
import { actualAbv, actualAbvFromBrix } from "./density";

// Frontend liczy realne ABV z odczytów pobranych z API. Wzór jest 1-liniowy,
// więc duplikujemy go zamiast iść w paczkę współdzieloną.

describe("actualAbv (frontend)", () => {
  it("standardowy wzór winiarski (og - fg) * 131.25", () => {
    expect(actualAbv(1.09, 1.0)).toBeCloseTo(11.81, 1);
  });

  it("zwraca null gdy fg > og", () => {
    expect(actualAbv(1.0, 1.05)).toBeNull();
  });

  it("zwraca null dla NaN/poza zakresem SG", () => {
    expect(actualAbv(NaN, 1.0)).toBeNull();
    expect(actualAbv(0, 1.0)).toBeNull();
  });

  it("zaokrąglone do 1 miejsca", () => {
    expect(actualAbv(1.05, 1.005)).toBe(5.9);
  });
});

describe("actualAbvFromBrix (frontend)", () => {
  it("ogBlg=12, fgBlg=4 → realistyczne ABV ~3-6%", () => {
    const r = actualAbvFromBrix(12, 4);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(3);
    expect(r!).toBeLessThan(6);
  });

  it("zwraca null gdy fg > og", () => {
    expect(actualAbvFromBrix(4, 12)).toBeNull();
  });
});
