import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  date,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const recipeStatus = pgEnum("recipe_status", ["draft", "validated"]);
export const recipeCategory = pgEnum("recipe_category", [
  "wino",
  "nalewka",
  "cydr",
  "miod",
]);
export const batchStage = pgEnum("batch_stage", [
  "fermentacja-burzliwa",
  "fermentacja-cicha",
  "dojrzewanie",
  "butelkowanie",
]);

// Konto przechodzi z "pending" (po rejestracji, czeka na aktywację) do "active"
// (kliknął link aktywacyjny i ustawił hasło). Tylko "active" może się zalogować.
export const userStatus = pgEnum("user_status", ["pending", "active"]);

// Jednorazowy token wysyłany na maila. "activation" → przy rejestracji,
// "password_reset" → po /api/auth/password-reset/request.
export const userTokenKind = pgEnum("user_token_kind", [
  "activation",
  "password_reset",
]);

// E-mail trzymamy zawsze lowercased; warstwa serwisu normalizuje wejście. Hasło
// nullable, bo "pending" user nie ma jeszcze hasła (ustawia je przez aktywację).
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  status: userStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// Tokeny aktywacyjne / resetu hasła. Trzymamy hash, nie surowy token; jednorazowe
// (consumedAt znaczy "zużyty, ignorować"), z TTL przez expiresAt.
export const userTokens = pgTable("user_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: userTokenKind("kind").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserTokenRow = typeof userTokens.$inferSelect;
export type NewUserTokenRow = typeof userTokens.$inferInsert;

// Sesja = opaque token w cookie HttpOnly + jego hash w DB. Logout / revoke
// usuwa rekord. Wygasanie sliding (przedłużenie przy aktywności) — opcjonalne,
// na razie sztywny TTL.
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  fruit: text("fruit").notNull(),
  category: recipeCategory("category").notNull(),
  fruitKg: real("fruit_kg").notNull(),
  sugarKg: real("sugar_kg").notNull(),
  waterL: real("water_l").notNull(),
  yeastType: text("yeast_type").notNull(),
  targetAbv: real("target_abv").notNull(),
  fermentationDays: integer("fermentation_days").notNull(),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  sourceUrls: jsonb("source_urls").$type<string[]>().notNull().default([]),
  status: recipeStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewSlug: text("view_slug").notNull().unique(),
  // Właściciel nastawu — od kont. Każdy nastaw należy do dokładnie jednego
  // usera; usunięcie konta kasuje też jego nastawy (RODO + porządek).
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  stage: batchStage("stage").notNull().default("fermentacja-burzliwa"),
  startDate: date("start_date").notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id, {
    onDelete: "set null",
  }),
  // Tryb pokazowy: gdy true, mutacje (etap/data/pomiar/wpis) są otwarte
  // dla wszystkich (właściciel wciąż istnieje, ale dowolny gość też edytuje).
  // Używamy do publicznego demo nastawu na stronie startowej.
  isDemo: boolean("is_demo").notNull().default(false),
  // Snapshot kroków instrukcji (z receptury przy tworzeniu lub z kreatora).
  instructionSteps: jsonb("instruction_steps")
    .$type<string[]>()
    .notNull()
    .default([]),
  // Indeksy zaznaczonych kroków checklisty (0-based).
  checkedStepIndices: jsonb("checked_step_indices")
    .$type<number[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BatchRow = typeof batches.$inferSelect;
export type NewBatchRow = typeof batches.$inferInsert;

export const measurements = pgTable("measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
  // Co najmniej jedno z (brix, sg) musi być podane — wymuszane na warstwie
  // walidacji i serwisu; DB pozwala na NULL, żeby zachować elastyczność.
  brix: real("brix"),
  sg: real("sg"),
  temperatureC: real("temperature_c"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MeasurementRow = typeof measurements.$inferSelect;
export type NewMeasurementRow = typeof measurements.$inferInsert;

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  entryAt: timestamp("entry_at", { withTimezone: true }).notNull(),
  body: text("body").notNull(),
  // photoKey trzymamy oddzielnie od photoUrl — klucz w R2 do bulk-delete,
  // URL do wyświetlenia (pochodzi z /api/photos/:key+ albo custom domain).
  photoKey: text("photo_key"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type JournalEntryRow = typeof journalEntries.$inferSelect;
export type NewJournalEntryRow = typeof journalEntries.$inferInsert;
