---
name: backend-bimbrownik
description: Konwencje backendu Gąsior — trasy Hono na Cloudflare Workers oraz wzorce Drizzle/Neon (Postgres). Użyj przy dodawaniu endpointów API lub zmianach w bazie.
---

# Backend Gąsior

Wytyczne do API receptur na Hono (Cloudflare Workers) + Neon (Postgres) przez Drizzle.

## Stack

- **Hono** — router i middleware, wejście w `src/index.ts`.
- **Cloudflare Workers** — konfiguracja w `wrangler.jsonc`,
  `compatibility_flags: ["nodejs_compat"]`.
- **Neon** serverless Postgres przez **Drizzle** (`drizzle-orm/neon-http`).
- Schema bazy: `src/db/schema.ts`; połączenie: `src/db/index.ts`.

## Bindingi i sekrety

- `DATABASE_URL` (connection string Neon) — sekret, NIE w repo.
  - Lokalnie: `backend/.dev.vars` (kopia z `.dev.vars.example`).
  - Produkcja: `wrangler secret put DATABASE_URL`.
- Połączenie DB twórz **per request** z `c.env.DATABASE_URL` (Workers nie mają
  globalnego stanu między żądaniami — nie trzymaj klienta w module-scope).

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export const getDb = (url: string) => drizzle(neon(url));
```

## Wzorce tras

- Prefiks `/api`. CORS przez `hono/cors` (dozwól origin frontendu).
- Walidacja wejścia przez `@hono/zod-validator` + Zod.
- Zwracaj JSON; błędy przez `c.json({ error }, status)`.
- Trzymaj handlery cienkie; logikę domenową (obliczenia ABV) w `src/lib/`.

```ts
app.get("/api/recipes", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db.select().from(recipes);
  return c.json(rows);
});
```

## Reguły domenowe

- Pole `status`: `draft` (domyślnie) → `validated` po przejściu walidacji.
- Obliczenie potencjalnego ABV: `cukier_g_na_litr / 17 ≈ %ABV`. Wystaw jako
  helper w `src/lib/abv.ts` i używaj zarówno przy zapisie, jak i w odpowiedzi.
- `steps` i `sourceUrls` przechowuj jako `jsonb` (tablice).

## Checklist przy nowym endpoincie

1. Walidacja wejścia (Zod).
2. `getDb(c.env.DATABASE_URL)` per request.
3. Obsługa błędów + właściwy status HTTP.
4. CORS dla origin frontendu.
5. Migracja: `npm run db:generate` po zmianie schemy, potem `db:push`.
