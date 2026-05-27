import { neon } from "@neondatabase/serverless";

// Hard reset DEVowej bazy: usuwa wszystkie obiekty Drizzle, żeby `db:migrate:dev`
// mógł odpalić migracje od zera (po przejściu z `db:push` na `db:migrate`).
//
// UŻYWAJ WYŁĄCZNIE NA DEV. Skrypt celowo nie jest podpięty pod `.prod.vars`.
// Wymaga jawnego potwierdzenia: CONFIRM=yes npm run db:reset:dev

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Brak DATABASE_URL (ustaw w .dev.vars).");
  process.exit(1);
}

if (process.env.CONFIRM !== "yes") {
  console.error(
    "❌ Reset zniszczy WSZYSTKIE dane w bazie wskazanej przez .dev.vars.",
  );
  console.error("   Aby kontynuować, dodaj CONFIRM=yes do komendy:");
  console.error("     CONFIRM=yes npm run db:reset:dev");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("➡  Dropuję obiekty schematu...");
// CASCADE czyści zależności (np. tabelę zależną od typu enum).
await sql`DROP TABLE IF EXISTS recipes CASCADE`;
await sql`DROP TYPE IF EXISTS recipe_status CASCADE`;
await sql`DROP TYPE IF EXISTS recipe_category CASCADE`;
// Historia migracji Drizzle — żeby migrate ruszył od 0000.
await sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;

console.log("✅ Baza wyczyszczona. Następne kroki:");
console.log("   npm run db:migrate:dev");
console.log("   npm run db:seed");
