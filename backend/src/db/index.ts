import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Twórz połączenie per request z c.env.DATABASE_URL.
// Workers nie mają trwałego stanu między żądaniami, więc nie cachuj klienta
// w zakresie modułu.
export const getDb = (databaseUrl: string) =>
  drizzle(neon(databaseUrl), { schema });

export type Db = ReturnType<typeof getDb>;
