# Plan: Gąsior

> Source PRD: `PRD.md` (w katalogu projektu)

## Architectural decisions

Decyzje trwałe, obowiązujące we wszystkich fazach:

- **Architecture style**: aplikacja webowa SPA (React + Vite + Tailwind v4, deploy
  Cloudflare Pages) + API na Hono (Cloudflare Workers). Komunikacja JSON przez REST.
- **Data model**: Postgres (Neon) przez Drizzle ORM. Encje: `recipes` (read-only z
  poziomu aplikacji), `batches` (nastawy), `measurements` (pomiary), `journal_entries`
  (wpisy dziennika, z opcjonalnym zdjęciem). Pola JSON (`steps`, `source_urls`) jako
  `jsonb`.
- **Auth / autoryzacja**: BRAK kont użytkowników. Receptury niemodyfikowalne z poziomu
  aplikacji (wejście tylko przez Claude Code). Nastaw chroniony parą: publiczny
  `viewSlug` (tylko odczyt) + sekretny `editCode` (wymagany do KAŻDEJ mutacji).
  Kody losowe, nieodgadywalne, `editCode` nigdy nie zwracany przez endpoint odczytu.
- **Integrations**: Cloudflare R2 na zdjęcia nastawów. Subagenci Claude Code
  (`recipe-researcher`, `recipe-validator`) + skrypt importu uruchamiany z maszyny
  kuratora jako jedyna ścieżka zapisu receptur.
- **Key constraints**: treści UI po polsku, kod po angielsku; dostępność WCAG AA,
  mobile-first; sekrety (`DATABASE_URL`, klucze R2, token importu) nigdy w repo;
  aplikacja dotyczy wyłącznie fermentacji (nie destylacji).
- **Domain logic**: kalkulator ABV/gęstości jako deep module — potencjalne ABV z cukru
  (~17 g/l ≈ 1% ABV), realne ABV `(OG − FG) × 131.25`, przeliczenia Blg ↔ SG.

---

## Phase 1: Tracer — pierwsza receptura end-to-end

**User stories**: 1, 6, 7, 8, 12 (część)

### What to build

Najcieńszy plasterek dowodzący całego pipeline'u. Skrypt importu (uruchamiany z
maszyny kuratora) zapisuje jedną zwalidowaną recepturę do Neon. Backend serwuje listę
i pojedynczą recepturę. Frontend pokazuje listę kart oraz widok szczegółów receptury:
proporcje (owoc, cukier, woda, drożdże), docelowe ABV, czas fermentacji, kroki, źródła
i badge statusu `validated`/`draft`.

### Acceptance criteria

- [x] Skrypt importu zapisuje recepturę do Neon ze statusem `validated`.
- [x] Lista receptur ładuje się w aplikacji z prawdziwych danych z bazy.
- [x] Widok szczegółów pokazuje wszystkie pola: proporcje, ABV, czas, kroki, źródła.
- [x] Badge statusu odróżnia `validated` od `draft`.
- [x] Stany ładowania i błędu obsłużone na obu widokach.

---

## Phase 2: Workflow kuracji receptur (Claude Code)

**User stories**: 10, 11, 12, 13

### What to build

Pełna ścieżka kuracji poza aplikacją. `recipe-researcher` znajduje przepisy dla
podanego owocu i zwraca je w ujednoliconym formacie ze źródłami; `recipe-validator`
sprawdza poprawność i bezpieczeństwo (bilans cukier→ABV, drożdże, sanitacja,
ostrzeżenia). Skrypt importu obsługuje dodawanie, aktualizację i usuwanie receptur,
ustawiając status na `validated` po przejściu walidacji. Efekt: baza zapełniona wieloma
recepturami dla różnych owoców i kategorii.

### Acceptance criteria

- [x] `recipe-researcher` zwraca receptury w ustalonym formacie z `source_urls`.
- [x] `recipe-validator` zwraca werdykt (pass/warn/fail) z obliczeniami i uwagami.
- [x] Skrypt importu potrafi dodać, zaktualizować i usunąć recepturę w Neon.
- [x] W bazie jest wiele receptur dla różnych owoców i kategorii (wino/nalewka/cydr/miód).
- [x] Tylko zwalidowane receptury dostają status `validated`.

---

## Phase 3: Przeglądanie biblioteki

**User stories**: 2, 3, 4, 5, 9

### What to build

Warstwa odkrywania receptur. Backend przyjmuje parametry filtrowania; frontend daje
kontrolki: filtr po owocu, po kategorii (wino/nalewka/cydr/miód pitny), po docelowym
ABV oraz wyszukiwarkę tekstową po nazwie/owocu. Dodanie pola `category` do modelu
receptury. Szczegóły receptury eksponują ostrzeżenia bezpieczeństwa (np. owoce pestkowe).

### Acceptance criteria

- [x] Filtr po owocu zwraca wyłącznie pasujące receptury.
- [x] Filtr po kategorii zwraca wyłącznie wybrany typ.
- [x] Filtr/sortowanie po ABV działa poprawnie.
- [x] Wyszukiwarka tekstowa trafia po nazwie i owocu, bez względu na wielkość liter.
- [x] Łączenie filtrów zawęża poprawnie; brak wyników → pusty stan, nie błąd.
- [x] Ostrzeżenia bezpieczeństwa widoczne w szczegółach receptury.

---

## Phase 4: Tracer trackera nastawów

**User stories**: 14, 16, 17, 18, 19, 20

### What to build

Minimalny, kompletny tracker. Użytkownik zakłada nastaw „od zera"; serwis generuje
`viewSlug` (link podglądu) i `editCode` (sekret właściciela) i pokazuje je raz po
utworzeniu. Otwarcie linku podglądu pokazuje stan nastawu bez `editCode`. Edycja
(zmiana etapu: fermentacja burzliwa / cicha / dojrzewanie / butelkowanie; data startu)
możliwa wyłącznie po podaniu poprawnego `editCode`. Encje `batches` w Neon.

### Acceptance criteria

- [x] Utworzenie nastawu zwraca `viewSlug` i `editCode` (pokazane użytkownikowi raz).
- [x] Odczyt po `viewSlug` pokazuje dane nastawu i NIE ujawnia `editCode`.
- [x] Mutacja bez/ze złym `editCode` jest odrzucona (401/403), dane nietknięte.
- [x] Mutacja z poprawnym `editCode` zapisuje zmianę etapu/daty.
- [x] `viewSlug` nie pozwala wywnioskować `editCode`.

---

## Phase 5: Pomiary i kalkulator ABV

**User stories**: 21, 22, 26 (część)

### What to build

Deep module kalkulatora ABV/gęstości (potencjalne ABV, realne ABV z OG/FG, konwersje
Blg ↔ SG) z pełnym pokryciem testami — budowany i weryfikowany w izolacji. Na nim:
dodawanie pomiarów do nastawu (Blg/SG, temperatura, data) chronione `editCode`,
encja `measurements`. Aplikacja liczy realne ABV z odczytów początkowego i końcowego.
Oś czasu pokazuje pomiary chronologicznie.

### Acceptance criteria

- [x] Kalkulator: testy jednostkowe wzorów (potencjalne/realne ABV, Blg↔SG) zielone.
- [x] Przypadki brzegowe kalkulatora (objętość 0, brak odczytu) zwracają bezpieczny
      wynik, nie wyjątek.
- [x] Dodanie pomiaru (po `editCode`) zapisuje Blg/SG, temperaturę i datę.
- [x] Realne ABV liczone z odczytów i widoczne na stronie nastawu.
- [x] Pomiary widoczne na osi czasu w kolejności chronologicznej.

---

## Phase 6: Dziennik i zdjęcia (R2)

**User stories**: 23, 24, 26

### What to build

Dziennik nastawu: wpisy tekstowe z datą (smak, zapach, klarowność), encja
`journal_entries`, dodawanie chronione `editCode`. Upload zdjęć do Cloudflare R2 za
prostym interfejsem (zapis obiektu → publiczny URL), z limitami typu i rozmiaru;
zdjęcie dowiązane do wpisu dziennika. Oś czasu łączy pomiary i wpisy dziennika w jednym
chronologicznym widoku.

### Acceptance criteria

- [x] Dodanie wpisu dziennika (po `editCode`) zapisuje treść i datę.
- [x] Akceptowany obraz wgrywa się do R2 i zwraca działający URL.
- [x] Zbyt duży plik / niedozwolony typ odrzucone z czytelnym błędem.
- [x] Wgrane zdjęcie jest serwowane i widoczne we wpisie.
- [x] Oś czasu pokazuje pomiary i wpisy razem, chronologicznie.

---

## Phase 7: Nastaw z receptury + wskaźniki czynności

**User stories**: 15, 25

### What to build

Integracja dwóch filarów. Zakładanie nastawu z konkretnej receptury: przeniesienie
proporcji, kroków i powiązania (`recipeId`) do nowego nastawu. Wskaźniki kolejnych
czynności liczone z daty startu i etapów: „za X dni zlewanie", „za X dni butelkowanie",
prezentowane na stronie nastawu przy jej otwarciu.

### Acceptance criteria

- [x] „Załóż nastaw z tej receptury" tworzy nastaw z przeniesionymi proporcjami i krokami.
- [x] Nastaw przechowuje powiązanie z recepturą źródłową.
- [x] Wskaźnik kolejnej czynności wyliczany z daty startu i etapu.
- [x] Wskaźniki aktualizują się wraz ze zmianą etapu nastawu.

---

## Phase 8: Dopracowanie i deploy

**User stories**: przekrojowe (jakość i wdrożenie)

### What to build

Przekrojowe szlify i wdrożenie produkcyjne. Dostępność WCAG AA (semantyka, aria,
kontrast, focus-visible, obsługa klawiatury), responsywność telefon→desktop, dopracowane
stany puste/ładowania/błędu na wszystkich widokach. Deploy backendu na Workers (sekrety
`DATABASE_URL`, klucze R2, binding R2) i frontendu na Pages (z `VITE_API_URL` na URL
Workera), dane produkcyjne w Neon.

### Acceptance criteria

- [ ] Kluczowe widoki przechodzą audyt dostępności (WCAG AA): kontrast, klawiatura, aria.
- [ ] Aplikacja jest użyteczna na telefonie i desktopie.
- [ ] Każde zapytanie ma stan ładowania, błędu i pustego wyniku.
- [ ] Backend wdrożony na Workers z sekretami i bindingiem R2; brak sekretów w repo.
- [ ] Frontend wdrożony na Pages, wskazuje na produkcyjny Worker; przepływy E2E działają.
