# 08 — Dopracowanie + deploy

**Typ**: HITL (konto Cloudflare, sekrety, binding R2)

## Parent PRD

`PRD.md` (sekcje: Further Notes; Implementation Decisions → Stack; Validation Strategy → Pozostałe historie)

## What to build

Przekrojowe szlify i wdrożenie produkcyjne. Dostępność WCAG AA (semantyka, aria,
kontrast, focus-visible, obsługa klawiatury), responsywność telefon→desktop, dopracowane
stany puste/ładowania/błędu na wszystkich widokach. Deploy backendu na Workers (sekrety
`DATABASE_URL`, klucze R2, binding R2) i frontendu na Pages (z `VITE_API_URL` na URL
Workera), dane produkcyjne w Neon.

## Acceptance criteria

- [ ] Kluczowe widoki przechodzą audyt dostępności (WCAG AA): kontrast, klawiatura, aria.
- [ ] Aplikacja jest użyteczna na telefonie i desktopie.
- [ ] Każde zapytanie ma stan ładowania, błędu i pustego wyniku.
- [ ] Backend wdrożony na Workers z sekretami i bindingiem R2; brak sekretów w repo.
- [ ] Frontend wdrożony na Pages, wskazuje na produkcyjny Worker; przepływy E2E działają.

## Blocked by

- Blocked by #01, #02, #03, #04, #05, #06, #07 (domyka całość)

## User stories addressed

- Przekrojowe (jakość i wdrożenie wszystkich historii)
