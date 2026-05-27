import { getDb } from "../src/db";
import {
  users,
  userTokens,
  sessions,
  recipes,
  batches,
  measurements,
  journalEntries,
} from "../src/db/schema";

type Ctx = {
  DEV_DATABASE_URL?: string;
  PROD_DATABASE_URL?: string;
};

function requireUrl(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Brak ${name} w środowisku.`);
  }
  return value;
}

function rowCountLabel(table: string, count: number): string {
  return `${table}: ${count}`;
}

async function main(env: Ctx) {
  const devUrl = requireUrl(env.DEV_DATABASE_URL, "DEV_DATABASE_URL");
  const prodUrl = requireUrl(env.PROD_DATABASE_URL, "PROD_DATABASE_URL");

  const dev = getDb(devUrl);
  const prod = getDb(prodUrl);

  const before = {
    users: (await dev.select().from(users)).length,
    userTokens: (await dev.select().from(userTokens)).length,
    sessions: (await dev.select().from(sessions)).length,
    recipes: (await dev.select().from(recipes)).length,
    batches: (await dev.select().from(batches)).length,
    measurements: (await dev.select().from(measurements)).length,
    journalEntries: (await dev.select().from(journalEntries)).length,
  };

  console.log("DEV counts:");
  console.log(
    [
      rowCountLabel("users", before.users),
      rowCountLabel("user_tokens", before.userTokens),
      rowCountLabel("sessions", before.sessions),
      rowCountLabel("recipes", before.recipes),
      rowCountLabel("batches", before.batches),
      rowCountLabel("measurements", before.measurements),
      rowCountLabel("journal_entries", before.journalEntries),
    ].join("\n"),
  );

  const devUsers = await dev.select().from(users);
  const devUserTokens = await dev.select().from(userTokens);
  const devSessions = await dev.select().from(sessions);
  const devRecipes = await dev.select().from(recipes);
  const devBatches = await dev.select().from(batches);
  const devMeasurements = await dev.select().from(measurements);
  const devJournalEntries = await dev.select().from(journalEntries);

  // Neon HTTP driver nie wspiera transaction() w Drizzle, więc wykonujemy
  // sekwencyjnie w bezpiecznej kolejności FK.
  await prod.delete(journalEntries);
  await prod.delete(measurements);
  await prod.delete(sessions);
  await prod.delete(userTokens);
  await prod.delete(batches);
  await prod.delete(recipes);
  await prod.delete(users);

  if (devUsers.length) await prod.insert(users).values(devUsers);
  if (devRecipes.length) await prod.insert(recipes).values(devRecipes);
  if (devBatches.length) await prod.insert(batches).values(devBatches);
  if (devUserTokens.length) await prod.insert(userTokens).values(devUserTokens);
  if (devSessions.length) await prod.insert(sessions).values(devSessions);
  if (devMeasurements.length) await prod.insert(measurements).values(devMeasurements);
  if (devJournalEntries.length) await prod.insert(journalEntries).values(devJournalEntries);

  const after = {
    users: (await prod.select().from(users)).length,
    userTokens: (await prod.select().from(userTokens)).length,
    sessions: (await prod.select().from(sessions)).length,
    recipes: (await prod.select().from(recipes)).length,
    batches: (await prod.select().from(batches)).length,
    measurements: (await prod.select().from(measurements)).length,
    journalEntries: (await prod.select().from(journalEntries)).length,
  };

  console.log("\nPROD counts po migracji:");
  console.log(
    [
      rowCountLabel("users", after.users),
      rowCountLabel("user_tokens", after.userTokens),
      rowCountLabel("sessions", after.sessions),
      rowCountLabel("recipes", after.recipes),
      rowCountLabel("batches", after.batches),
      rowCountLabel("measurements", after.measurements),
      rowCountLabel("journal_entries", after.journalEntries),
    ].join("\n"),
  );
}

main(process.env).catch((e) => {
  console.error("Błąd migracji dev -> prod:", e);
  process.exit(1);
});
