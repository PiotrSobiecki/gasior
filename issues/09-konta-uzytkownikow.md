# 09 — Konta użytkowników + nastawy per user (Resend)

**Typ**: HITL (klucz Resend, weryfikacja domeny w panelu Resenda, sekrety CF)

## Parent PRD

Rozszerza `PRD.md` o model wielu użytkowników (poprzednio: anonimowy
view-slug + edit-code). Każdy nastaw należy do konkretnego konta; ekran z
„kod edycji, zapisz teraz" znika z UI.

## What to build

Pełna autoryzacja kontowa zastępująca dotychczasowy model `editCode`:

- rejestracja e-mailem → link aktywacyjny przez **Resend** → ustawienie hasła,
- logowanie hasłem, sesja w cookie `HttpOnly` (opaque token w tabeli `sessions`),
- reset hasła przez link na maila (ten sam mechanizm `user_tokens`),
- każdy `batch` ma `user_id` (FK do `users`, NOT NULL, kaskadowo); stare nastawy
  z modelu edit-code **czyścimy** (`TRUNCATE batches CASCADE` w migracji),
- po zalogowaniu landing nie pokazuje się — `/moje-nastawy` jest domyślnym
  widokiem; lista własnych nastawów z „następną czynnością" z modułu `nextActions`,
- `BatchView` decyduje o edycji po **właścicielu sesji** (i nadal po `isDemo`
  dla showcase batchy) — banner z edit-code znika z UI.

Decyzje projektowe (omówione w czacie planującym):

| # | Decyzja | Wybór |
|---|---------|-------|
| 1 | Co ze starymi nastawami? | **Kasujemy** (TRUNCATE) — model edit-code przestaje istnieć. |
| 2 | Czy anonimowe tworzenie zostaje? | **Nie.** Tworzenie wymaga konta; ekran „zapisz kod" znika. |
| 3 | Reset hasła w pierwszej fazie? | **Tak** — od razu, wspólny mechanizm `user_tokens`. |
| 4 | Domena w Resend | Lokalnie i w prod używamy istniejącej zweryfikowanej domeny właściciela Resenda; klucz API jest per-konto, nie per-domena. |

## Status

- **Slice 1 (backend auth core + przepięcie batches/measurements/journal na sesję)**: ✅ zamknięty. 283/283 testy backendu zielone, typecheck clean, migracja zaaplikowana w `gasior-dev`.
- **Slice 2 (frontend auth UI + redesign NewBatch/BatchView)**: ✅ zamknięty. 130/130 testów frontu zielone, `tsc --noEmit` clean. Slice okazał się szerszy niż planowano — żeby utrzymać kompilację, w tym samym kroku przepisaliśmy też `NewBatch` (redirect zamiast ekranu edit-code) i `BatchView` (autoryzacja po sesji + `useCurrentUser`).
- **Slice 3 (`/moje-nastawy` + dashboard usera)**: ⏳ pending — został właściwie tylko widok listy nastawów + ewentualny redirect z `/` dla zalogowanych.
- **Slice 4 (polish, sekrety prod, README)**: ⏳ pending.

## Acceptance criteria

- [x] Migracja Drizzle: `users` / `user_tokens` / `sessions`, `batches.user_id` NOT NULL, drop `batches.edit_code_hash`, TRUNCATE batches CASCADE.
- [x] Hashowanie haseł: PBKDF2-SHA256 (Web Crypto, ≥100k iteracji), format phc-podobny.
- [x] Sesja: opaque token (32B base64url) w `HttpOnly` cookie, SHA-256 w DB, TTL 30 dni, logout usuwa rekord.
- [x] Resend transport za interfejsem `EmailTransport`; in-memory transport w testach i fallback dla `wrangler dev` bez klucza.
- [x] `/api/auth`: `POST /register`, `POST /activate`, `POST /login`, `POST /logout`, `POST /password-reset/request`, `POST /password-reset/confirm`, `GET /me`.
- [x] Middleware `requireUser()`: wczytuje sesję z cookie, zwraca 401 gdy brak/wygasła.
- [x] `POST /api/batches` wymaga sesji; tworzy nastaw z `user_id = currentUser.id`. Brak ekranu z editCode w odpowiedzi.
- [x] `GET /api/batches?mine=true` — lista nastawów zalogowanego usera (wymaga sesji).
- [x] `PATCH /api/batches/:viewSlug`, `POST .../measurements`, `POST .../journal` autoryzowane po **właścicielu nastawu** (sesja) lub `isDemo=true`; nagłówek `X-Edit-Code` znika z API.
- [x] CORS: konkretny `FRONTEND_ORIGIN`, `Access-Control-Allow-Credentials: true`.
- [x] Sekrety: `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_ORIGIN` w `.dev.vars.example` (sekrety prod do wgrania w Slice 4).
- [x] Frontend: strony `/logowanie`, `/rejestracja`, `/aktywacja?token=…`, `/zapomniane-haslo`, `/reset-hasla?token=…`. (`/moje-nastawy` — Slice 3).
- [x] Frontend: hook `useCurrentUser()` (TanStack Query → `/api/auth/me`), wszystkie fetche z `credentials: 'include'`.
- [x] Frontend: `NavBar` rozróżnia guest/auth (auth: „Moje nastawy" + „Wyloguj"; guest: „Zaloguj" + „Załóż konto").
- [x] Frontend: `NewBatch` po stworzeniu nastawu redirectuje od razu na `/nastaw/:viewSlug` (zero ekranu „kod edycji"). Strona pod `RequireAuth`.
- [x] Frontend: `BatchView` włącza edycję gdy `currentUser.id === batch.userId` lub gdy `batch.isDemo` — bez banneru z editCode. Guest dostaje CTA do logowania, zalogowany nie-właściciel widzi tłumaczenie „inny użytkownik".
- [x] Frontend: `RequireAuth` guard z redirectem na `/logowanie` + zapamiętaniem `from` w `state`.
- [x] Frontend: usunięty martwy moduł `lib/editCodeStorage.ts`; nowe `ApiValidationError` jako wspólny typ błędu walidacji 4xx.
- [x] Backend test suite zielony (283/283); frontend test suite zielony (130/130); ręczny smoke (register → activate → login → POST batch → GET ?mine) do zrobienia po Slice 3.

## Plan implementacji (vertical slices)

### Slice 1 — Backend: auth core (bez UI)
1. **Migracja Drizzle**: `users` (email lowercased unique, password_hash nullable, display_name, status: `pending|active`), `user_tokens` (kind: `activation|password_reset`, token_hash unique, expires_at, consumed_at), `sessions` (user_id FK, token_hash unique, expires_at). `batches`: TRUNCATE CASCADE, DROP `edit_code_hash`, ADD `user_id` NOT NULL FK.
2. **`lib/passwords.ts`** — PBKDF2-SHA256, format `pbkdf2-sha256$<iter>$<salt>$<hash>`. Testy.
3. **`lib/sessions.ts`** — token gen (32B base64url), SHA-256 hash, cookie helpers (`buildSessionCookie`, `parseSessionCookie`), TTL. Testy.
4. **`lib/email.ts`** (interfejs) + **`email.in-memory.ts`** (testowy transport z `sent[]`) + **`email.resend.ts`** (HTTP POST → `api.resend.com/emails`). Testy in-memory.
5. **`auth/repo.ts`** + `repo.in-memory.ts` + `repo.neon.ts` (CRUD na users / user_tokens / sessions).
6. **`auth/service.ts`** — `register`, `activate`, `login`, `logout`, `requestPasswordReset`, `resetPassword`, `currentUserBySessionToken`. Pure logika z deps injection (repo, password hasher, email, clock, tokenGen). Testy unit z in-memory.
7. **`auth/routes.ts`** + **`auth/middleware.ts`** (`requireUser`). Testy integracji route + cookie.

### Slice 2 — Batches/measurements/journal pod sesję
1. **`batches/repo.ts`**: usunąć `editCodeHash` z `Batch`, dodać `userId`. Update `BatchInput`. Public type bez zmian funkcjonalnych (znika `editCodeHash`).
2. **`batches/service.ts`**: `createBatch` wymaga `userId`; usunąć generowanie `editCode`; `updateBatch` zamiast `verifyEditCode` przyjmuje `actorUserId` i porównuje z `batch.userId` (lub `isDemo`). Nowy `listMine(userId)`.
3. **`batches/routes.ts`**: usunąć `X-Edit-Code`. Wszystkie mutujące wymagają `requireUser`; route `GET /?mine=true`.
4. **`measurements/service.ts` + `journal/service.ts`**: analogicznie — `actorUserId` zamiast `editCode`; `isDemo` nadal bypassuje. Routes używają `requireUser`.
5. **`scripts/set-demo.ts`** — zostawiamy (właściciel oznacza swój nastaw jako demo).

### Slice 3 — Frontend: auth UI + dashboard
1. **`lib/api.ts`**: wszystkie fetche `credentials: 'include'`; nowe endpointy `/api/auth/*`; nowy `BatchPublic.userId`; usunięcie `editCode` z typów.
2. **`hooks/useCurrentUser.ts`** (TanStack Query → `/api/auth/me`, retry: false, staleTime krótkie).
3. **Pages**: `Login.tsx`, `Register.tsx`, `Activate.tsx`, `PasswordResetRequest.tsx`, `PasswordResetConfirm.tsx`, `MyBatches.tsx`. Wszystkie z `react-hook-form` (już używamy zod walidacji) lub minimalnym useState (decyzja przy implementacji).
4. **`components/RequireAuth.tsx`** — guard dla `/moje-nastawy`, `/nastawy/nowy`.
5. **`NavBar`** — guest: „Zaloguj | Zarejestruj"; auth: „Moje nastawy | Wyloguj".
6. **Router**: gdy zalogowany na `/`, redirect na `/moje-nastawy`.
7. **`NewBatch`**: usunąć ekran z editCode; po sukcesie `navigate(/nastaw/:viewSlug)`.
8. **`BatchView`**: edycja warunkowana `currentUser?.id === batch.userId || batch.isDemo`. Usunąć banner z edit-code, formularz „wpisz kod edycji", przyciski logout-edycji.

### Slice 4 — Polish
1. Rate-limit na `/api/auth/login` i `/api/auth/register` (in-memory counter w Worker globals; w prod ewentualnie KV / Durable Object).
2. Sekrety: `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_ORIGIN` w `wrangler secret put` i w `.dev.vars.example`.
3. Templates maila aktywacji i resetu (text + html, polski; link na `FRONTEND_ORIGIN/aktywacja/:token`).
4. README + CLAUDE.md — nowy onboarding (jak założyć konto Resend, jak dodać domenę, jak ustawić sekrety).
5. Ręczny smoke (register → mail → activate → utworzenie nastawu → wylogowanie → ponowne logowanie).

## Konfiguracja (sekrety + env)

`.dev.vars.example`:
```
DATABASE_URL="postgres://..."
FRONTEND_ORIGIN="http://localhost:5173"
RESEND_API_KEY="re_..."
MAIL_FROM="Bimbrownik <noreply@twoja-zweryfikowana-domena>"
SESSION_TTL_DAYS="30"
```

W prod: `wrangler secret put RESEND_API_KEY` itd. Klucz Resend jest per-konto;
sam `MAIL_FROM` musi wskazywać na **zweryfikowaną w panelu Resenda domenę**.
Bez weryfikacji domeny można testować tylko z `onboarding@resend.dev`, ale
maile dochodzą wtedy wyłącznie na adres właściciela konta Resend (do testów).

## Blocked by

- Blocked by #04 (batches), #05 (measurements), #06 (journal), #07 (recipe linking).
- Konsumuje funkcje z modułu `lib/nextActions.ts` (do listy „następna czynność").

## User stories addressed

- Nowa historia (poza PRD): „Jako użytkownik chcę mieć własne konto i widzieć
  tylko swoje nastawy, żeby nie pamiętać kodu edycji i nie udostępniać go".
- Pośrednio uściśla US 04, 15, 25 (model dostępu).
