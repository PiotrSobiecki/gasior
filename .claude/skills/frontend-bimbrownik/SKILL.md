---
name: frontend-bimbrownik
description: Konwencje budowy UI w projekcie Gąsior (React + Vite + Tailwind v4). Użyj przy tworzeniu komponentów, stron i widoków receptur owocowych.
---

# Frontend Gąsior

Wytyczne do budowy interfejsu aplikacji do receptur nastawów owocowych.

## Stack i zasady

- **React 19 + TypeScript**, funkcyjne komponenty, hooki.
- **Vite** jako bundler; dev: `npm run dev`.
- **Tailwind CSS v4** — konfiguracja w CSS (`@import "tailwindcss"`), tokeny
  motywu przez `@theme`. NIE twórz `tailwind.config.js` chyba że konieczne.
- **TanStack Query** do całej komunikacji z API (`src/lib/api.ts`). Nie używaj
  `useEffect` + `fetch` do pobierania danych.
- Komponenty w `src/components/`, strony/widoki w `src/routes/` lub `src/pages/`.

## Design (najnowsze wytyczne)

- Mobile-first, responsywnie. Siatka kart receptur (`grid`, `auto-fit`).
- Spójne tokeny: paleta inspirowana owocami (głęboki bordo / amber / zieleń).
  Definiuj kolory w `@theme`, nie hardcoduj hexów w komponentach.
- Dostępność: semantyczny HTML, `aria-*`, kontrast min. WCAG AA, focus-visible.
- Stany ładowania (skeleton) i błędu dla każdego zapytania.
- Mikrointerakcje subtelne; unikaj generycznego „AI-look" (zero gradientów
  fioletowo-niebieskich na siłę). Jeśli potrzeba dopracowanego wyglądu —
  rozważ skill `frontend-design`.

## Model danych w UI

Receptura (z API):
```ts
type Recipe = {
  id: string;
  name: string;
  fruit: string;
  fruitKg: number;
  sugarKg: number;
  waterL: number;
  yeastType: string;
  targetAbv: number;
  fermentationDays: number;
  steps: string[];
  sourceUrls: string[];
  status: "draft" | "validated";
};
```

## Wzorce

- Badge `validated` vs `draft` widoczny na karcie receptury.
- Filtr po owocu i po ABV.
- Kalkulator: przelicz proporcje receptury na docelową objętość nastawu.
- Zawsze pokazuj `sourceUrls` przy szczegółach receptury.

## Checklist przy nowym widoku

1. Pobieranie przez TanStack Query (loading + error + empty state).
2. Responsywność (telefon → desktop); przy problemach mobile wołaj agenta `mobile-frontend`.
3. Dostępność (klawiatura, aria, kontrast).
4. Brak hardkodowanych URL API — używaj `import.meta.env.VITE_API_URL`.
