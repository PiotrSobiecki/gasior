import { createNeonRecipeRepo } from "../src/recipes/repo.neon";
import { planDedupe } from "../src/recipes/dedupe";

// Usuwa duplikaty receptur w bazie. Bezpiecznie domyślnie pokazuje plan
// (dry-run) — żeby coś faktycznie skasować, dodaj `--apply`.
//
// Użycie:
//   npm run db:dedupe          → dry-run (nic nie zmienia)
//   npm run db:dedupe:apply    → wykonuje DELETE na bazie dev
//   npm run db:dedupe:prod:apply  → to samo na produkcji
//
// Klucz duplikatu: name + fruit + category + 4 proporcje + drożdże + dni
// fermentacji (po normalizacji). Patrz `src/recipes/dedupe.ts`.

const apply = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Brak DATABASE_URL (ustaw w .dev.vars / .prod.vars).");
  process.exit(1);
}

const repo = createNeonRecipeRepo(databaseUrl);
const all = await repo.list();
console.log(`Pobrałem ${all.length} receptur z bazy.`);

const plan = planDedupe(all);

if (plan.groups.length === 0) {
  console.log("Brak duplikatów — nic do roboty.");
  process.exit(0);
}

console.log(
  `\nZnaleziono ${plan.groups.length} grup duplikatów (${plan.toDeleteCount} rekordów do skasowania):\n`,
);

for (const g of plan.groups) {
  console.log(`▶ ${g.keep.name} (${g.keep.fruit}, ${g.keep.category})`);
  console.log(`  KEEP  ${g.keep.id}  [${g.keep.status}, ${g.keep.createdAt}]`);
  for (const d of g.drop) {
    console.log(
      `  DROP  ${d.id}  [${d.status}, ${d.createdAt}]`,
    );
  }
  console.log("");
}

if (!apply) {
  console.log(
    "To był dry-run. Żeby faktycznie skasować duplikaty: `npm run db:dedupe -- --apply`",
  );
  process.exit(0);
}

console.log("Usuwam duplikaty…");
let deleted = 0;
let failed = 0;
for (const g of plan.groups) {
  for (const d of g.drop) {
    const ok = await repo.delete(d.id);
    if (ok) {
      deleted++;
    } else {
      failed++;
      console.error(`  ! Nie udało się skasować ${d.id} (${d.name})`);
    }
  }
}
console.log(`\nGotowe: skasowano ${deleted}, błędów ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
