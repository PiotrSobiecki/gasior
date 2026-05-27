import { defineConfig } from "drizzle-kit";

// drizzle-kit (CLI) czyta DATABASE_URL ze środowiska.
// Lokalnie wczytaj z .dev.vars, np.:
//   node --env-file=.dev.vars node_modules/drizzle-kit/bin.cjs push
// albo ustaw zmienną w shellu przed komendą.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
