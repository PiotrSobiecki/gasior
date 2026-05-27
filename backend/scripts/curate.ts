import { readFileSync } from "node:fs";
import { parseCommand, runCommand } from "../src/recipes/curation";
import { createNeonRecipeRepo } from "../src/recipes/repo.neon";

// Narzędzie kuracji receptur (uruchamiane z maszyny kuratora). Receptury powinny
// być wcześniej sprawdzone przez subagenta recipe-validator.
//
// Użycie:
//   npm run db:curate add <plik.json>
//   npm run db:curate update <id> <plik.json>
//   npm run db:curate delete <id>

const USAGE =
  "Użycie: curate add <plik.json> | update <id> <plik.json> | delete <id>";

const parsed = parseCommand(process.argv.slice(2));
if (!parsed.ok) {
  console.error(parsed.error);
  console.error(USAGE);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Brak DATABASE_URL (ustaw w .dev.vars).");
  process.exit(1);
}

const repo = createNeonRecipeRepo(databaseUrl);
try {
  const result = await runCommand(parsed.command, {
    repo,
    readFile: (path) => JSON.parse(readFileSync(path, "utf8")),
  });
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(result.message);
} catch (e) {
  console.error("Błąd:", (e as Error).message);
  process.exit(1);
}
