# 07 — Nastaw z receptury + wskaźniki czynności

**Typ**: AFK

## Parent PRD

`PRD.md` (sekcje: User Stories → Tracker nastawów (15, 25); Implementation Decisions → Kluczowe przepływy danych)

## What to build

Integracja dwóch filarów. Zakładanie nastawu z konkretnej receptury: przeniesienie
proporcji, kroków i powiązania (`recipeId`) do nowego nastawu. Wskaźniki kolejnych
czynności liczone z daty startu i etapów: „za X dni zlewanie", „za X dni butelkowanie",
prezentowane na stronie nastawu przy jej otwarciu.

## Acceptance criteria

- [x] „Załóż nastaw z tej receptury" tworzy nastaw z przeniesionymi proporcjami i krokami.
- [x] Nastaw przechowuje powiązanie z recepturą źródłową.
- [x] Wskaźnik kolejnej czynności wyliczany z daty startu i etapu.
- [x] Wskaźniki aktualizują się wraz ze zmianą etapu nastawu.

## Blocked by

- Blocked by #01 (biblioteka receptur) i #04 (serwis nastawów)

## User stories addressed

- User story 15
- User story 25
