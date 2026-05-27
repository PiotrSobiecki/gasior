import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseRecipeImport } from "./import";
import { validateRecipe } from "./validate";

// Biblioteka seedowych receptur — żadna nie może mieć verdict "fail" (czyli
// twardo niedopuszczalna, np. ABV poza fermentacją). Warn jest akceptowalny:
// seed-script i tak wrzuci taką recepturę jako "draft", a nie "validated", więc
// nigdy nie udaje, że jest zwalidowana — czeka na manualną weryfikację.

const SEED_DIR = resolve(__dirname, "../../seed/recipes");

function listSeedFiles(): string[] {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

const seedFiles = listSeedFiles();

describe("seed recipes", () => {
  it("contains at least four recipes spanning different drink categories", () => {
    // Wino, nalewka, cydr, miód pitny — kontrakt PRD/issue #02.
    expect(seedFiles.length).toBeGreaterThanOrEqual(4);

    const namesLower = seedFiles
      .map((f) =>
        JSON.parse(readFileSync(resolve(SEED_DIR, f), "utf8")).name as string,
      )
      .map((n) => n.toLowerCase());

    expect(namesLower.some((n) => n.includes("wino"))).toBe(true);
    expect(namesLower.some((n) => n.includes("nalewka"))).toBe(true);
    expect(namesLower.some((n) => n.includes("cydr"))).toBe(true);
    expect(namesLower.some((n) => n.includes("miód"))).toBe(true);
  });

  it.each(seedFiles)("%s parses cleanly", (file) => {
    const raw = JSON.parse(readFileSync(resolve(SEED_DIR, file), "utf8"));
    const parsed = parseRecipeImport(raw);
    expect(parsed.ok).toBe(true);
  });

  it.each(seedFiles)("%s does not fail the semantic validator", (file) => {
    const raw = JSON.parse(readFileSync(resolve(SEED_DIR, file), "utf8"));
    const parsed = parseRecipeImport(raw);
    if (!parsed.ok) throw new Error(`parse failed for ${file}`);
    const result = validateRecipe(parsed.value);
    if (result.verdict === "fail") {
      // Wypisz issues, żeby było jasne co poprawić w seedzie.
      throw new Error(
        `${file}: verdict=fail; issues: ${result.issues
          .map((i) => `[${i.severity}] ${i.field}: ${i.message}`)
          .join(" | ")}`,
      );
    }
    expect(result.verdict).not.toBe("fail");
  });
});
