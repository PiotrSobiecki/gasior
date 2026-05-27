# 03 — Przeglądanie biblioteki (filtry i wyszukiwarka)

**Typ**: AFK

## Parent PRD

`PRD.md` (sekcje: User Stories → Biblioteka receptur; Validation Strategy → Filtry biblioteki)

## What to build

Warstwa odkrywania receptur. Backend przyjmuje parametry filtrowania; frontend daje
kontrolki: filtr po owocu, po kategorii (wino/nalewka/cydr/miód pitny), po docelowym
ABV oraz wyszukiwarkę tekstową po nazwie/owocu. Dodanie pola `category` do modelu
receptury. Szczegóły receptury eksponują ostrzeżenia bezpieczeństwa (np. owoce pestkowe).

## Acceptance criteria

- [x] Filtr po owocu zwraca wyłącznie pasujące receptury.
- [x] Filtr po kategorii zwraca wyłącznie wybrany typ.
- [x] Filtr/sortowanie po ABV działa poprawnie.
- [x] Wyszukiwarka tekstowa trafia po nazwie i owocu, bez względu na wielkość liter.
- [x] Łączenie filtrów zawęża poprawnie; brak wyników → pusty stan, nie błąd.
- [x] Ostrzeżenia bezpieczeństwa widoczne w szczegółach receptury.

## Blocked by

- Blocked by #01 (model receptury i ścieżka odczytu); korzysta z danych z #02

## User stories addressed

- User story 2
- User story 3
- User story 4
- User story 5
- User story 9
