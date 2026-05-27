# 05 — Pomiary + kalkulator ABV

**Typ**: AFK

## Parent PRD

`PRD.md` (sekcje: Implementation Decisions → Kalkulator ABV/gęstości, Serwis nastawów; Validation Strategy → Kalkulator ABV/gęstości)

## What to build

Deep module kalkulatora ABV/gęstości (potencjalne ABV, realne ABV z OG/FG, konwersje
Blg ↔ SG) z pełnym pokryciem testami — budowany i weryfikowany w izolacji. Na nim:
dodawanie pomiarów do nastawu (Blg/SG, temperatura, data) chronione `editCode`,
encja `measurements`. Aplikacja liczy realne ABV z odczytów początkowego i końcowego.
Oś czasu pokazuje pomiary chronologicznie.

## Acceptance criteria

- [x] Kalkulator: testy jednostkowe wzorów (potencjalne/realne ABV, Blg↔SG) zielone.
- [x] Przypadki brzegowe (objętość 0, brak odczytu) zwracają bezpieczny wynik, nie wyjątek.
- [x] Dodanie pomiaru (po `editCode`) zapisuje Blg/SG, temperaturę i datę.
- [x] Realne ABV liczone z odczytów i widoczne na stronie nastawu.
- [x] Pomiary widoczne na osi czasu w kolejności chronologicznej.

## Blocked by

- Blocked by #04 (potrzebny serwis nastawów i autoryzacja editCode)

## User stories addressed

- User story 21
- User story 22
- User story 26 (część)
