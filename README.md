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

- Backend: `cd backend && npx wrangler secret put DATABASE_URL && npm run deploy`
- Frontend: build (`npm run build`) → Cloudflare Pages (ustaw `VITE_API_URL`
  na URL wdrożonego Workera).
