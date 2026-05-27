import { describe, it, expect } from "vitest";
import { parseRecipeImport } from "./import";

const validRecord = {
  name: "Wino z aronii",
  fruit: "aronia",
  category: "wino",
  fruitKg: 2,
  sugarKg: 1.6,
  waterL: 6,
  yeastType: "drożdże winiarskie",
  targetAbv: 12,
  fermentationDays: 30,
  steps: ["Rozgnieć owoce"],
  sourceUrls: ["https://example.com/aronia"],
};

describe("parseRecipeImport", () => {
  it("accepts a valid record and defaults status to validated", () => {
    const result = parseRecipeImport(validRecord);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("validated");
      expect(result.value.name).toBe("Wino z aronii");
    }
  });

  it("rejects an incomplete record", () => {
    const result = parseRecipeImport({ name: "Brak proporcji" });

    expect(result.ok).toBe(false);
  });

  it("rejects a record without a recipe category", () => {
    // Filtrowanie biblioteki po kategorii wymaga, by każda receptura miała
    // jawną kategorię — wnioskowanie po nazwie jest zbyt zawodne.
    const { category: _category, ...withoutCategory } = validRecord;
    const result = parseRecipeImport(withoutCategory);

    expect(result.ok).toBe(false);
  });

  it("rejects an unknown recipe category", () => {
    const result = parseRecipeImport({ ...validRecord, category: "kombucha" });

    expect(result.ok).toBe(false);
  });

  it("accepts a known recipe category", () => {
    const result = parseRecipeImport({ ...validRecord, category: "nalewka" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.category).toBe("nalewka");
  });

  it("accepts nalewka with zero sugar, zero water and high ABV (maceracja w alkoholu)", () => {
    // Klasyczna nalewka na spirytusie: owoce + cukier + alkohol, bez wody.
    // sugarKg=0/waterL=0/targetAbv=45 to fizycznie sensowne wartości, więc
    // schema importu nie powinna ich odrzucać; semantyczny walidator decyduje
    // o pass/warn osobno.
    const result = parseRecipeImport({
      ...validRecord,
      category: "nalewka",
      fruit: "malina",
      sugarKg: 0,
      waterL: 0,
      targetAbv: 45,
      yeastType: "brak (maceracja w spirytusie)",
    });

    expect(result.ok).toBe(true);
  });
});
