import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCommand } from "../src/recipes/curation";
import { createNeonRecipeRepo } from "../src/recipes/repo.neon";

// Batchowe ładowanie wszystkich receptur z katalogu seed/recipes/ do Neon.
// Każda receptura przechodzi pełny gate walidatora (verdict pass → validated,
// warn → draft, fail → odmowa). Uruchamiaj na koncie kuratora.

const SEED_DIR = resolve(import.meta.dirname, "../seed/recipes");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Brak DATABASE_URL (ustaw w .dev.vars).");
  process.exit(1);
}

const repo = createNeonRecipeRepo(databaseUrl);
const files = readdirSync(SEED_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.error(`Brak plików w ${SEED_DIR}.`);
  process.exit(1);
}

let okCount = 0;
let failCount = 0;
for (const file of files) {
  const fullPath = resolve(SEED_DIR, file);
  const result = await runCommand(
    { action: "add", file: fullPath },
    {
      repo,
      readFile: (path) => JSON.parse(readFileSync(path, "utf8")),
    },
  );
  if (result.ok) {
    console.log(`OK  ${file} — ${result.message}`);
    okCount++;
  } else {
    console.error(`FAIL ${file} — ${result.error}`);
    failCount++;
  }
}

console.log(`\nSeed zakończony: ${okCount} OK, ${failCount} FAIL.`);
process.exit(failCount > 0 ? 1 : 0);
