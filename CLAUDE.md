# CLAUDE.md

Wskazówki dla Claude Code przy pracy z tym projektem.

## Czym jest Gąsior

Aplikacja do tworzenia i zarządzania recepturami **nastawów owocowych** (wina
owocowe, nalewki, cydry, miody pitne) z różnych owoców. Użytkownik wybiera owoc,
a aplikacja proponuje sprawdzoną recepturę: proporcje cukru, wody, drożdży,
szacowane ABV oraz harmonogram fermentacji.

> To projekt hobbystyczny o domowej fermentacji owoców (winiarstwo domowe).
> Skupiamy się na recepturach fermentacyjnych, bezpieczeństwie sanitarnym
> i poprawności obliczeń (cukier → alkohol).
>
> Folder repo nadal nazywa się historycznie `bimbrownik/`, ale produkt to
> **Gąsior**. Foldery skilli (`.claude/skills/*-bimbrownik`) zachowują starą
> nazwę jako wewnętrzne identyfikatory.

## Architektura

Monorepo z dwoma niezależnymi częściami:

```
bimbrownik/          # nazwa folderu repo (historyczna)
├── frontend/        # React + Vite + Tailwind v4 (deploy: Cloudflare Pages)
├── backend/         # Hono na Cloudflare Workers + Neon (Postgres) przez Drizzle
└── .claude/
    ├── agents/      # subagenci: research, walidacja, mobile UI
    └── skills/      # skille: frontend, backend
```

### Frontend (`frontend/`)
- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4** (przez `@tailwindcss/vite`, konfiguracja w CSS, nie w JS)
- **TanStack Query** do pobierania danych z API
- shadcn/ui + Radix do komponentów, gdy potrzebne
- Zmienna `VITE_API_URL` wskazuje na backend

### Backend (`backend/`)
- **Hono** na **Cloudflare Workers**
- **Neon** (serverless Postgres) przez **Drizzle ORM** (`drizzle-orm/neon-http`)
- Konfiguracja Workera: `wrangler.jsonc`
- Sekrety lokalnie:
  - `.dev.vars` — dev DB (skopiuj z `.dev.vars.example`)
  - `.prod.vars` — prod DB (skopiuj z `.prod.vars.example`)
- Schema bazy: `src/db/schema.ts`
- Migracje: `drizzle/*.sql` (zatwierdzone, idą do gita)

## Komendy

### Frontend
```bash
cd frontend
npm install
npm run dev          # serwer deweloperski Vite
npm run build        # build produkcyjny
npm run preview      # podgląd buildu
```

### Backend
```bash
cd backend
npm install
npm run dev               # wrangler dev (lokalny Worker)
npm run deploy            # deploy na Cloudflare Workers

# Drizzle — workflow migracji
npm run db:generate       # generuje nową migrację ze zmian w schema.ts
npm run db:migrate:dev    # uruchamia migracje na DEV (czyta .dev.vars)
npm run db:migrate:prod   # uruchamia migracje na PROD (czyta .prod.vars)
npm run db:push:dev       # eksperymentalny push schemy bez migracji (tylko dev!)
npm run db:studio:dev     # Drizzle Studio na DEV
npm run db:studio:prod    # Drizzle Studio na PROD (ostrożnie)

# Dane
npm run db:seed           # ładuje seed/recipes/*.json do DEV
npm run db:seed:prod      # to samo na PROD
npm run db:curate         # CLI kuratora (add/update/delete) na DEV
```

## Subagenci (`.claude/agents/`)

- **recipe-researcher** — wyszukuje w internecie przepisy na nastawy owocowe,
  wyciąga z nich ustrukturyzowane dane (owoc, cukier, woda, drożdże, ABV, czas).
- **recipe-validator** — sprawdza poprawność receptury: proporcje cukru do wody,
  realność szacowanego ABV, dobór drożdży, harmonogram fermentacji, kroki
  sanitarne i ostrzeżenia bezpieczeństwa.
- **mobile-frontend** — audyt i poprawki responsywności UI (NavBar, hero,
  formularze, karty, widoki nastawów) na telefonie i tablecie.

Wywołuj je przez `Task`/Agent, gdy dodajesz lub weryfikujesz receptury albo
naprawiasz layout mobile.

## Skille (`.claude/skills/`)

- **frontend-bimbrownik** — konwencje budowy UI w tym projekcie.
- **backend-bimbrownik** — konwencje tras Hono na CF i wzorce Drizzle/Neon.

## Konwencje

- Komentarze i treści UI po polsku; nazwy zmiennych/funkcji po angielsku.
- Nigdy nie commituj `.env`, `.dev.vars` ani `DATABASE_URL`.
- Receptury w bazie mają pole `status`: `draft` → `validated` (po przejściu
  przez recipe-validator).
- Obliczenia ABV: ~17 g cukru na litr daje ~1% ABV (potencjalny alkohol).
