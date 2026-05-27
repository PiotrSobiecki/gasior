# PRD — Gąsior

> Aplikacja do tworzenia i zarządzania recepturami nastawów owocowych oraz
> śledzenia własnych nastawów w czasie.

## Problem Statement

Domowe winiarstwo (nastawy owocowe: wina, nalewki, cydry, miody pitne) opiera się
na rozproszonych przepisach o niepewnej jakości i na ręcznym pilnowaniu, co i kiedy
zrobić z nastawem. Hobbysta nie ma jednego miejsca, w którym:

- znajdzie **sprawdzone** receptury z poprawnymi proporcjami i bezpieczeństwem,
- założy konkretny nastaw i będzie go **śledził w czasie** (etapy, pomiary, notatki),
- bez zakładania konta i bez bałaganu w zeszycie czy notatniku w telefonie.

## Solution

Publiczna aplikacja webowa z dwoma filarami:

1. **Biblioteka receptur** (tylko do odczytu dla użytkownika) — kuratorowany katalog
   nastawów owocowych. Receptury trafiają do bazy wyłącznie przez Claude Code
   (subagent `recipe-researcher` znajduje przepisy, `recipe-validator` sprawdza ich
   poprawność i bezpieczeństwo, skrypt importu zapisuje do bazy). Dzięki temu jakość
   jest pod kontrolą, a aplikacja nie wymaga panelu admina.

2. **Tracker nastawów** — każdy użytkownik może (bez logowania) założyć nastaw,
   najczęściej z konkretnej receptury. Dostaje **link podglądu** (do dzielenia się)
   oraz **kod edycji** (sekret właściciela). Nastaw jest zapisany na serwerze (Neon),
   więc działa między urządzeniami. Użytkownik śledzi etapy, pomiary gęstości/cukru,
   prowadzi dziennik ze zdjęciami, a aplikacja liczy realne ABV i pokazuje wskaźniki
   „za X dni zlewanie/butelkowanie".

Brak kont użytkowników. Receptury są niemodyfikowalne z poziomu aplikacji.

## User Stories

### Biblioteka receptur (odczyt)

1. Jako użytkownik chcę przeglądać listę receptur nastawów owocowych, aby znaleźć
   pomysł na nastaw.
2. Jako użytkownik chcę filtrować receptury po owocu (np. aronia, śliwka, jabłko),
   aby szybko zawęzić wybór do tego, co mam.
3. Jako użytkownik chcę filtrować receptury po kategorii (wino / nalewka / cydr /
   miód pitny), aby przeglądać tylko interesujący mnie typ.
4. Jako użytkownik chcę filtrować/sortować receptury po docelowym ABV, aby dobrać moc.
5. Jako użytkownik chcę wyszukiwać receptury po nazwie/owocu tekstowo, aby szybko
   trafić do konkretnej.
6. Jako użytkownik chcę otworzyć szczegóły receptury (proporcje cukru, wody, owoców,
   typ drożdży, ABV, czas fermentacji, kroki), aby wiedzieć dokładnie, jak ją wykonać.
7. Jako użytkownik chcę widzieć źródła receptury (linki), aby ocenić jej wiarygodność.
8. Jako użytkownik chcę widzieć status receptury (`draft` / `validated`), aby wiedzieć,
   czy przeszła weryfikację.
9. Jako użytkownik chcę widzieć ostrzeżenia bezpieczeństwa (np. owoce pestkowe), aby
   uniknąć błędów zdrowotnych.

### Kurator receptur (Ty, przez Claude Code)

10. Jako kurator chcę użyć subagenta `recipe-researcher`, aby znaleźć w internecie
    przepisy dla danego owocu w ujednoliconym formacie ze źródłami.
11. Jako kurator chcę użyć subagenta `recipe-validator`, aby sprawdzić poprawność i
    bezpieczeństwo receptury przed publikacją.
12. Jako kurator chcę zaimportować zwalidowane receptury do bazy skryptem z mojej
    maszyny, aby trafiły do aplikacji ze statusem `validated`.
13. Jako kurator chcę móc aktualizować i usuwać receptury przez Claude Code, aby
    utrzymać jakość katalogu bez panelu admina w aplikacji.

### Tracker nastawów (zapis, bez kont)

14. Jako użytkownik chcę założyć nowy nastaw, aby zacząć go śledzić.
15. Jako użytkownik chcę założyć nastaw na podstawie receptury, aby proporcje i kroki
    przeniosły się automatycznie.
16. Jako użytkownik chcę założyć nastaw „od zera" (bez receptury), aby śledzić własny
    eksperyment.
17. Jako użytkownik chcę po założeniu nastawu dostać link podglądu i kod edycji, aby
    móc do niego wrócić i nim zarządzać.
18. Jako użytkownik chcę otworzyć nastaw przez link podglądu, aby zobaczyć jego stan
    (również na innym urządzeniu albo udostępniając znajomemu).
19. Jako użytkownik chcę edytować nastaw tylko po podaniu kodu edycji, aby nikt
    przypadkowy nie zepsuł moich danych.
20. Jako użytkownik chcę ustawić datę startu i bieżący etap (fermentacja burzliwa /
    cicha / dojrzewanie / butelkowanie), aby śledzić postęp.
21. Jako użytkownik chcę dodawać pomiary (Blg/SG, temperatura) z datą, aby śledzić
    przebieg fermentacji.
22. Jako użytkownik chcę, aby aplikacja liczyła realne ABV z odczytów początkowego i
    końcowego, abym znał faktyczną moc nastawu.
23. Jako użytkownik chcę dodawać wpisy do dziennika (smak, zapach, klarowność) z datą,
    aby pamiętać przebieg.
24. Jako użytkownik chcę dodawać zdjęcia do wpisów dziennika, aby dokumentować nastaw
    wizualnie.
25. Jako użytkownik chcę widzieć wskaźnik „za X dni zlewanie/butelkowanie" wyliczany z
    daty startu i etapów, aby wiedzieć, co robić dalej.
26. Jako użytkownik chcę widzieć historię/oś czasu nastawu (pomiary + wpisy
    chronologicznie), aby ogarnąć całość jednym rzutem oka.

## Implementation Decisions

### Główne komponenty (deep modules)

- **Kalkulator ABV/gęstości** — czysta, bezstanowa logika: potencjalne ABV z cukru
  (~17 g/l ≈ 1% ABV), realne ABV z odczytów `(OG − FG) × 131.25`, przeliczenia
  Blg ↔ SG. Niezależnie testowalny, stabilny interfejs.
- **Biblioteka receptur** — odczytowe API nad tabelą receptur (lista, szczegóły,
  filtry po owocu/kategorii/ABV, wyszukiwanie). Bez ścieżki zapisu w aplikacji.
- **Ścieżka importu receptur** — poza aplikacją: subagenci Claude Code + skrypt
  importu uruchamiany z maszyny kuratora, piszący bezpośrednio do bazy.
- **Serwis nastawów** — tworzenie nastawu (generuje publiczny `viewSlug` i sekretny
  `editCode`), odczyt po `viewSlug`, mutacje (etap, pomiary, wpisy) autoryzowane
  `editCode`, wyliczanie wskaźników kolejnych czynności.
- **Przechowywanie zdjęć (R2)** — upload i serwowanie zdjęć wpisów dziennika za
  prostym interfejsem (zapis obiektu → publiczny URL), z limitami typu/rozmiaru.
- **Frontend** — dwa filary: widok biblioteki (przeglądanie/filtry/szczegóły) oraz
  tracker nastawu (tworzenie/śledzenie/oś czasu).

### Granice i integracje

- **Brak kont/uwierzytelniania użytkowników.** Autoryzacja zapisu nastawu opiera się
  wyłącznie na znajomości `editCode`. Receptury są read-only z poziomu aplikacji.
- **Stack** (ustalony przez klienta): React + Vite + Tailwind (frontend, deploy CF
  Pages); Hono na Cloudflare Workers (backend); Neon (Postgres) przez Drizzle ORM;
  Cloudflare R2 na zdjęcia.
- **Model dostępu nastawu**: `viewSlug` daje tylko odczyt; `editCode` wymagany do
  każdej mutacji. Kody generowane losowo, nieodgadywalne.

### Kluczowe przepływy danych

- *Publikacja receptury*: research (subagent) → walidacja (subagent) → import skryptem
  → tabela receptur (`validated`) → odczyt w aplikacji.
- *Założenie nastawu*: użytkownik (opcjonalnie z receptury) → serwis tworzy nastaw,
  zwraca `viewSlug` + `editCode` → użytkownik zapisuje kod.
- *Śledzenie*: mutacje z `editCode` dopisują pomiary/wpisy/etap → kalkulator liczy
  realne ABV i wskaźniki → oś czasu w widoku podglądu.

### Decyzje o zakresie

- Przypomnienia realizowane jako **wskaźniki w aplikacji** liczone przy otwarciu
  strony (bez maili/push).
- **Brak panelu admina** w aplikacji — zarządzanie recepturami wyłącznie przez
  Claude Code.

## Validation Strategy

### Kalkulator ABV/gęstości (testy jednostkowe)

- Potencjalne ABV: znane pary (cukier, objętość) → oczekiwane ABV w tolerancji.
- Realne ABV: znane OG/FG → wynik zgodny z `(OG − FG) × 131.25`.
- Konwersje Blg ↔ SG: wartości referencyjne w obie strony; przypadki brzegowe
  (objętość 0, brak odczytu) zwracają bezpieczny wynik, nie wyjątek.
- **Done**: pełne pokrycie wzorów testami, wszystkie zielone.

### Kontrola dostępu nastawu (bezpieczeństwo — wymagane)

- Żądanie odczytu z `viewSlug` zwraca dane bez `editCode`.
- Mutacja bez `editCode` lub z błędnym kodem → odrzucona (401/403), dane nietknięte.
- Mutacja z poprawnym `editCode` → wykonana.
- `viewSlug` nie pozwala wywnioskować `editCode`.
- **Done**: testy pozytywne i negatywne dla każdej trasy mutującej.

### Filtry biblioteki

- Filtr po owocu/kategorii zwraca wyłącznie pasujące pozycje.
- Wyszukiwanie tekstowe trafia po nazwie i owocu (bez wielkości liter).
- Łączenie filtrów (owoc + kategoria + ABV) zawęża poprawnie; brak wyników → pusty
  stan, nie błąd.
- **Done**: testy dla pojedynczych i złożonych filtrów oraz stanu pustego.

### Upload zdjęć (R2)

- Akceptowane typy obrazów wgrywają się i zwracają działający URL.
- Odrzucenie zbyt dużego pliku i niedozwolonego typu z czytelnym błędem.
- Wgrane zdjęcie jest serwowane i widoczne we wpisie dziennika.
- **Done**: testy ścieżki poprawnej i odrzuceń; weryfikacja serwowania.

### Pozostałe historie

Weryfikowane manualnie/e2e: przeglądanie i szczegóły receptur, założenie nastawu z
receptury i bez, oś czasu, wskaźniki kolejnych czynności, działanie linku podglądu
na drugim urządzeniu.

## Out of Scope

- Konta użytkowników, logowanie, profile.
- Panel admina/CMS w aplikacji (zarządzanie recepturami tylko przez Claude Code).
- Funkcje AI w działającej aplikacji (research/walidacja tylko jako subagenci na
  etapie kuracji) — kandydat na późniejszą fazę.
- Powiadomienia mailowe/push.
- Społeczność: oceny, komentarze, udostępnianie receptur przez użytkowników.
- Destylacja (aplikacja dotyczy wyłącznie fermentacji); treści o destylacji świadomie
  pomijane, z ostrzeżeniami bezpieczeństwa w walidacji receptur.
- Aplikacja mobilna natywna (web responsywny wystarcza).

## Further Notes

- Treści UI po polsku; nazwy w kodzie po angielsku.
- Paleta i wygląd wg najnowszych wytycznych frontendowych (Tailwind v4, dostępność
  WCAG AA, mobile-first), z unikaniem generycznej „AI-estetyki".
- Sekrety (`DATABASE_URL`, klucze R2, ewentualny token importu) nigdy w repo.
- Kolejność realizacji jako vertical slices — patrz roadmapa; każda faza dowozi
  działający przyrost.
