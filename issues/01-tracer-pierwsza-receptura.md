# 01 — Tracer: pierwsza receptura end-to-end

**Typ**: AFK

## Parent PRD

`PRD.md` (sekcje: Solution → Biblioteka receptur; Implementation Decisions → Biblioteka receptur, Ścieżka importu)

## What to build

Najcieńszy plasterek dowodzący całego pipeline'u na realnych danych. Skrypt importu
(uruchamiany z maszyny kuratora) zapisuje jedną zwalidowaną recepturę do Neon. Backend
serwuje listę i pojedynczą recepturę. Frontend pokazuje listę kart oraz widok
szczegółów: proporcje (owoc, cukier, woda, drożdże), docelowe ABV, czas fermentacji,
kroki, źródła i badge statusu.

## Acceptance criteria

- [x] Skrypt importu zapisuje recepturę do Neon ze statusem `validated`.
- [x] Lista receptur ładuje się w aplikacji z prawdziwych danych z bazy.
- [x] Widok szczegółów pokazuje wszystkie pola: proporcje, ABV, czas, kroki, źródła.
- [x] Badge statusu odróżnia `validated` od `draft`.
- [x] Stany ładowania i błędu obsłużone na obu widokach.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 1
- User story 6
- User story 7
- User story 8
- User story 12 (część)
