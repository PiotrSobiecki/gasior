import { describe, it, expect } from "vitest";
import {
  sugarForAbv,
  spiritForAbv,
  planNastaw,
  stylesFor,
} from "./calc";

describe("sugarForAbv", () => {
  it("computes sugar in kg for target ABV and volume", () => {
    // 12.5% * 17 g/l * 10 l = 2125 g = 2.13 kg
    expect(sugarForAbv(12.5, 10)).toBe(2.13);
  });

  it("returns 0 for non-positive volume or abv", () => {
    expect(sugarForAbv(12, 0)).toBe(0);
    expect(sugarForAbv(0, 10)).toBe(0);
  });
});

describe("spiritForAbv", () => {
  it("computes spirit litres needed at 95% strength", () => {
    // 30% * 10 l / 95 = 3.16 -> 3.2 l
    expect(spiritForAbv(30, 10)).toBe(3.2);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(spiritForAbv(30, 0)).toBe(0);
    expect(spiritForAbv(0, 10)).toBe(0);
  });
});

describe("planNastaw", () => {
  it("plans a fermentation drink with sugar and yeast", () => {
    const plan = planNastaw("wino", 10, 12);

    expect(plan.method).toBe("fermentacja");
    expect(plan.sugarKg).toBe(2.04);
    expect(plan.yeastType).toBeTruthy();
    expect(plan.spiritL).toBeUndefined();
  });

  it("plans a nalewka with spirit instead of yeast", () => {
    const plan = planNastaw("nalewka", 10, 30);

    expect(plan.method).toBe("maceracja");
    expect(plan.spiritL).toBe(3.2);
    expect(plan.spiritType).toContain("spirytus");
    expect(plan.yeastType).toBeUndefined();
  });
});

describe("stylesFor", () => {
  it("offers stronger styles for nalewka", () => {
    const abvs = stylesFor("nalewka").map((s) => s.abv);
    expect(Math.max(...abvs)).toBeGreaterThan(14);
  });

  it("offers fermentation styles for wine", () => {
    const abvs = stylesFor("wino").map((s) => s.abv);
    expect(Math.max(...abvs)).toBeLessThanOrEqual(15);
    expect(Math.min(...abvs)).toBeGreaterThanOrEqual(10);
  });

  it("uses realistic ABV presets for cydr", () => {
    const abvs = stylesFor("cydr").map((s) => s.abv);
    expect(Math.max(...abvs)).toBeLessThanOrEqual(8);
    expect(Math.min(...abvs)).toBeGreaterThanOrEqual(4);
  });
});
