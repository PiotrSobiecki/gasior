# 🏺 Gąsior

Aplikacja do tworzenia i zarządzania recepturami nastawów owocowych (wina,
nalewki, cydry, miody pitne) z różnych owoców.

## Stack

- **Frontend** — React 19 + Vite + Tailwind v4 + TanStack Query (`frontend/`)
- **Backend** — Hono na Cloudflare Workers (`backend/`)
- **Baza** — Neon (serverless Postgres) przez Drizzle ORM

## Szybki start

### 1. Backend
```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # wklej DATABASE_URL z Neon
# wypchnij schemę do bazy (z DATABASE_URL w środowisku):
npm run db:push
npm run dev                      # Worker na http://localhost:8787
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local       # VITE_API_URL=http://localhost:8787
npm run dev                      # http://localhost:5173
```

## Subagenci Claude Code

- `recipe-researcher` — wyszukuje przepisy w internecie i zwraca je w jednolitym
  formacie (owoc, cukier, woda, drożdże, ABV, kroki, źródła).
- `recipe-validator` — sprawdza poprawność i bezpieczeństwo receptury przed
  oznaczeniem jej jako `validated`.

Definicje: `.claude/agents/`. Skille pomocnicze: `.claude/skills/`.

## Deploy

- Backend (deploy z `.prod.vars`): `cd backend && node --env-file=.prod.vars node_modules/wrangler/bin/wrangler.js deploy`
- Backend (jednorazowe ustawienie sekretu, jeśli trzeba): `cd backend && node --env-file=.prod.vars node_modules/wrangler/bin/wrangler.js secret put DATABASE_URL`
- Backend (aktualizacja sekretów z `.prod.vars`, PowerShell):
  `cd backend; $keys=@('DATABASE_URL','FRONTEND_ORIGIN','MAIL_FROM','RESEND_API_KEY','SESSION_COOKIE_SECURE','SESSION_TTL_DAYS','PHOTO_BASE_URL'); foreach($k in $keys){ $v = node --env-file=.prod.vars -e "process.stdout.write(process.env['$k']||'')"; if($v){ $v | node --env-file=.prod.vars node_modules/wrangler/bin/wrangler.js secret put $k } }`
- Frontend: `cd frontend && $env:VITE_API_URL="https://gasior.online"; npm run build`
  → `wrangler pages deploy dist --project-name gasior`. API idzie przez ten sam
  origin (`functions/api/[[path]].ts` proxy → Worker), żeby uniknąć CORS.
- DNS `www`: CNAME na `gasior.pages.dev` (nie na `gasior.online` — inaczej 522).
