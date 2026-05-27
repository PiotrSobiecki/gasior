# 06 — Dziennik + zdjęcia (R2)

**Typ**: HITL (utworzenie i konfiguracja bucketu Cloudflare R2)

## Parent PRD

`PRD.md` (sekcje: Implementation Decisions → Przechowywanie zdjęć (R2), Serwis nastawów; Validation Strategy → Upload zdjęć (R2))

## What to build

Dziennik nastawu: wpisy tekstowe z datą (smak, zapach, klarowność), encja
`journal_entries`, dodawanie chronione `editCode`. Upload zdjęć do Cloudflare R2 za
prostym interfejsem (zapis obiektu → publiczny URL), z limitami typu i rozmiaru;
zdjęcie dowiązane do wpisu dziennika. Oś czasu łączy pomiary i wpisy w jednym
chronologicznym widoku.

## Acceptance criteria

- [x] Dodanie wpisu dziennika (po `editCode`) zapisuje treść i datę.
- [x] Akceptowany obraz wgrywa się do R2 i zwraca działający URL.
- [x] Zbyt duży plik / niedozwolony typ odrzucone z czytelnym błędem.
- [x] Wgrane zdjęcie jest serwowane i widoczne we wpisie.
- [x] Oś czasu pokazuje pomiary i wpisy razem, chronologicznie.

## Blocked by

- Blocked by #04 (serwis nastawów i autoryzacja editCode)

## User stories addressed

- User story 23
- User story 24
- User story 26
