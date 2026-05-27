# Issues — Gąsior

Slices wygenerowane z `PRD.md` (i `plans/bimbrownik.md`) jako tracer bullets.
Każdy plik to jedno, samodzielnie chwytalne zadanie. Bierz je w kolejności
zależności (blokery najpierw).

| # | Slice | Typ | Blokowane przez |
|---|-------|-----|-----------------|
| [01](01-tracer-pierwsza-receptura.md) | Tracer: pierwsza receptura end-to-end | AFK | — |
| [02](02-workflow-kuracji.md) | Workflow kuracji (subagenci + import) | HITL | #01 |
| [03](03-przegladanie-biblioteki.md) | Przeglądanie biblioteki (filtry, wyszukiwarka) | AFK | #01 |
| [04](04-tracer-trackera-nastawow.md) | Tracer trackera nastawów (viewSlug/editCode) | AFK | — |
| [05](05-pomiary-kalkulator-abv.md) | Pomiary + kalkulator ABV | AFK | #04 |
| [06](06-dziennik-zdjecia-r2.md) | Dziennik + zdjęcia (R2) | HITL | #04 |
| [07](07-nastaw-z-receptury-wskazniki.md) | Nastaw z receptury + wskaźniki czynności | AFK | #01, #04 |
| [08](08-dopracowanie-deploy.md) | Dopracowanie + deploy | HITL | #01–#07 |
| [09](09-konta-uzytkownikow.md) | Konta użytkowników + nastawy per user (Resend) | HITL | #04, #05, #06, #07 |

**Legenda**: AFK = da się zrobić i zmergować bez interakcji człowieka; HITL =
wymaga człowieka (ocena receptur, utworzenie bucketu R2, konto/sekrety CF).

> Gdy postawisz repo na GitHubie, te pliki łatwo przerobić na `gh issue create`.
