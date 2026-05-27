# 02 — Workflow kuracji receptur (Claude Code)

**Typ**: HITL (kuracja i walidacja receptur wymaga oceny człowieka)

## Parent PRD

`PRD.md` (sekcje: User Stories → Kurator receptur; Implementation Decisions → Ścieżka importu receptur)

## What to build

Pełna ścieżka kuracji poza aplikacją. `recipe-researcher` znajduje przepisy dla
podanego owocu i zwraca je w ujednoliconym formacie ze źródłami; `recipe-validator`
sprawdza poprawność i bezpieczeństwo (bilans cukier→ABV, drożdże, sanitacja,
ostrzeżenia). Skrypt importu obsługuje dodawanie, aktualizację i usuwanie receptur,
ustawiając status `validated` po przejściu walidacji. Efekt: baza zapełniona wieloma
recepturami dla różnych owoców i kategorii.

## Acceptance criteria

- [x] `recipe-researcher` zwraca receptury w ustalonym formacie z `source_urls`.
- [x] `recipe-validator` zwraca werdykt (pass/warn/fail) z obliczeniami i uwagami.
- [x] Skrypt importu potrafi dodać, zaktualizować i usunąć recepturę w Neon.
- [x] W bazie jest wiele receptur dla różnych owoców i kategorii (wino/nalewka/cydr/miód).
- [x] Tylko zwalidowane receptury dostają status `validated`.

## Blocked by

- Blocked by #01 (potrzebny działający model i ścieżka odczytu receptur)

## User stories addressed

- User story 10
- User story 11
- User story 12
- User story 13
