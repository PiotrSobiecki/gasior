import { createNeonBatchRepo } from "../src/batches/repo.neon";

// Oznacza nastaw jako "demo" (publicznie edytowalny bez kodu) lub cofa to.
// Użycie:
//   npm run db:demo <viewSlug>          → ustawia isDemo=true
//   npm run db:demo <viewSlug> off      → ustawia isDemo=false

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.error("Użycie: db:demo <viewSlug> [off]");
  process.exit(1);
}

const viewSlug = args[0];
const isDemo = args[1] !== "off";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Brak DATABASE_URL (ustaw w .dev.vars / .prod.vars).");
  process.exit(1);
}

const repo = createNeonBatchRepo(databaseUrl);
const updated = await repo.setDemoByViewSlug(viewSlug, isDemo);
if (!updated) {
  console.error(`Nie znaleziono nastawu o viewSlug=${viewSlug}`);
  process.exit(1);
}
console.log(
  `OK — nastaw ${updated.viewSlug} (${updated.name}) isDemo=${updated.isDemo}`,
);
