# 04 — Tracer trackera nastawów (viewSlug / editCode)

**Typ**: AFK

## Parent PRD

`PRD.md` (sekcje: Solution → Tracker nastawów; Implementation Decisions → Serwis nastawów; Validation Strategy → Kontrola dostępu nastawu)

## What to build

Minimalny, kompletny tracker. Użytkownik zakłada nastaw „od zera"; serwis generuje
`viewSlug` (link podglądu) i `editCode` (sekret właściciela) i pokazuje je raz po
utworzeniu. Otwarcie linku podglądu pokazuje stan nastawu bez `editCode`. Edycja
(zmiana etapu: fermentacja burzliwa / cicha / dojrzewanie / butelkowanie; data startu)
możliwa wyłącznie po podaniu poprawnego `editCode`. Encja `batches` w Neon.

## Acceptance criteria

- [x] Utworzenie nastawu zwraca `viewSlug` i `editCode` (pokazane użytkownikowi raz).
- [x] Odczyt po `viewSlug` pokazuje dane nastawu i NIE ujawnia `editCode`.
- [x] Mutacja bez/ze złym `editCode` jest odrzucona (401/403), dane nietknięte.
- [x] Mutacja z poprawnym `editCode` zapisuje zmianę etapu/daty.
- [x] `viewSlug` nie pozwala wywnioskować `editCode`.

## Blocked by

None - can start immediately (niezależne od receptur).

## User stories addressed

- User story 14
- User story 16
- User story 17
- User story 18
- User story 19
- User story 20
