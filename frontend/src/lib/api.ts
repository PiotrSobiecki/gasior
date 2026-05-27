export type RecipeCategory = "wino" | "nalewka" | "cydr" | "miod";
export type RecipeSort = "abv-asc" | "abv-desc";

export type Recipe = {
  id: string;
  name: string;
  fruit: string;
  category: RecipeCategory;
  fruitKg: number;
  sugarKg: number;
  waterL: number;
  yeastType: string;
  targetAbv: number;
  fermentationDays: number;
  steps: string[];
  sourceUrls: string[];
  status: "draft" | "validated";
  createdAt: string;
};

export type CreateRecipeInput = {
  name: string;
  fruit: string;
  category: RecipeCategory;
  fruitKg: number;
  sugarKg: number;
  waterL: number;
  yeastType: string;
  targetAbv: number;
  fermentationDays: number;
  steps: string[];
  sourceUrls: string[];
};

export type RecipeQuery = {
  fruit?: string;
  category?: RecipeCategory;
  minAbv?: number;
  maxAbv?: number;
  q?: string;
  sort?: RecipeSort;
};

const CONFIGURED_API_URL =
  (import.meta.env.VITE_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

/** Bazowy URL API — na produkcji zawsze origin strony (proxy Pages → Worker). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "gasior.online" ||
      host === "www.gasior.online" ||
      host.endsWith(".gasior.pages.dev")
    ) {
      return window.location.origin;
    }
  }
  return CONFIGURED_API_URL;
}

// Wszystkie fetche idą z `credentials: 'include'`, bo backend autoryzuje
// po sesyjnym cookie HttpOnly (CORS: Access-Control-Allow-Credentials).
const fetchWithCookies: typeof fetch = (input, init = {}) =>
  fetch(input, { ...init, credentials: "include" });

// Buduje pełny URL listy receptur z filtrów. Pomija puste/whitespace stringi
// oraz undefined — UI może bezpiecznie przekazywać surowy stan formularza.
export function buildRecipesUrl(baseUrl: string, query: RecipeQuery): string {
  const params = new URLSearchParams();
  const add = (key: string, value: string | number | undefined) => {
    if (value === undefined) return;
    const s = String(value).trim();
    if (s === "") return;
    params.set(key, s);
  };
  add("fruit", query.fruit);
  add("category", query.category);
  add("minAbv", query.minAbv);
  add("maxAbv", query.maxAbv);
  add("q", query.q);
  add("sort", query.sort);
  const qs = params.toString();
  return qs ? `${baseUrl}/api/recipes?${qs}` : `${baseUrl}/api/recipes`;
}

export async function fetchRecipes(query: RecipeQuery = {}): Promise<Recipe[]> {
  const res = await fetchWithCookies(buildRecipesUrl(getApiBaseUrl(), query));
  if (!res.ok) throw new Error("Nie udało się pobrać receptur");
  return res.json();
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/recipes/${id}`);
  if (res.status === 404) throw new Error("Nie znaleziono receptury");
  if (!res.ok) throw new Error("Nie udało się pobrać receptury");
  return res.json();
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new RecipeAuthError();
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawne dane receptury"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się dodać receptury");
  return res.json();
}

export async function estimateAbv(
  sugarKg: number,
  waterL: number,
): Promise<number> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/estimate-abv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sugarKg, waterL }),
  });
  if (!res.ok) throw new Error("Błąd kalkulacji ABV");
  const data = (await res.json()) as { abv: number };
  return data.abv;
}

// ────────────────────────────────────────────────────────────────────────
// Auth (konta + sesja)
// ────────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  status: "pending" | "active";
  createdAt: string;
};

export type RegisterInput = { email: string; displayName?: string };
export type ActivateInput = { token: string; password: string };
export type LoginInput = { email: string; password: string };
export type PasswordResetRequestInput = { email: string };
export type PasswordResetConfirmInput = { token: string; password: string };

// Wspólny typ błędu autoryzacji dla wszystkich mutacji nastawu. Pozwala UI
// rozróżnić: 401 = przekierowanie na /logowanie; 403 = "to nie twój nastaw".
export class BatchAuthError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Wymagane zalogowanie" : "Nie jesteś właścicielem tego nastawu");
    this.name = "BatchAuthError";
  }
}

// Reprezentuje 400 zwracane przez backend ze zwalidowanym tekstem błędu
// (np. zbyt krótkie hasło). Frontend pokazuje `message` user-facing.
export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

/** Sieć / CORS / blokada Cloudflare — fetch nie doszedł do sensownej odpowiedzi API. */
export class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiNetworkError";
  }
}

export function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiValidationError || err instanceof ApiNetworkError) {
    return err.message;
  }
  return fallback;
}

async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetchWithCookies(input, init);
  } catch {
    throw new ApiNetworkError(
      "Brak połączenia z serwerem. Odśwież stronę (Ctrl+Shift+R) i spróbuj ponownie.",
    );
  }
}

export class RecipeAuthError extends Error {
  constructor() {
    super("Wymagane zalogowanie");
    this.name = "RecipeAuthError";
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function register(input: RegisterInput): Promise<void> {
  const res = await apiFetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawny e-mail"),
    );
  }
  if (!res.ok) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Nie udało się zarejestrować"),
    );
  }
}

export async function activate(input: ActivateInput): Promise<User> {
  const res = await apiFetch(`${getApiBaseUrl()}/api/auth/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Link aktywacyjny jest niepoprawny lub wygasł"),
    );
  }
  if (!res.ok) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Nie udało się aktywować konta"),
    );
  }
  const data = (await res.json()) as { user: User };
  return data.user;
}

export async function login(input: LoginInput): Promise<User> {
  const res = await apiFetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawny e-mail lub hasło"),
    );
  }
  if (res.status === 403) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Konto nieaktywne — kliknij link aktywacyjny z maila"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się zalogować");
  const data = (await res.json()) as { user: User };
  return data.user;
}

export async function logout(): Promise<void> {
  await fetchWithCookies(`${getApiBaseUrl()}/api/auth/logout`, { method: "POST" });
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<void> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/api/auth/password-reset/request`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (res.status === 400) {
    throw new ApiValidationError(await readErrorMessage(res, "Niepoprawny e-mail"));
  }
  if (!res.ok) throw new Error("Nie udało się zainicjować resetu hasła");
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
): Promise<void> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/api/auth/password-reset/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Link resetu hasła jest niepoprawny lub wygasł"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się zresetować hasła");
}

// Zwraca aktualnie zalogowanego usera lub null (gdy brak sesji).
// Endpoint nigdy nie rzuca 401 — semantyka „kim jestem" musi działać dla guest.
export async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/auth/me`);
  if (!res.ok) return null;
  const data = (await res.json()) as { user: User | null };
  return data.user;
}

// ────────────────────────────────────────────────────────────────────────
// Tracker nastawów
// ────────────────────────────────────────────────────────────────────────

export type BatchStage =
  | "fermentacja-burzliwa"
  | "fermentacja-cicha"
  | "dojrzewanie"
  | "butelkowanie";

export const BATCH_STAGES: BatchStage[] = [
  "fermentacja-burzliwa",
  "fermentacja-cicha",
  "dojrzewanie",
  "butelkowanie",
];

export const BATCH_STAGE_LABELS: Record<BatchStage, string> = {
  "fermentacja-burzliwa": "Fermentacja burzliwa",
  "fermentacja-cicha": "Fermentacja cicha",
  dojrzewanie: "Dojrzewanie",
  butelkowanie: "Butelkowanie",
};

// Publiczny widok nastawu zwracany przez API. `userId` pozwala UI sprawdzić
// "czy to mój" bez dodatkowego zapytania (porównuje z `currentUser.id`).
export type BatchPublic = {
  id: string;
  viewSlug: string;
  userId: string;
  name: string;
  stage: BatchStage;
  startDate: string;
  recipeId: string | null;
  instructionSteps: string[];
  checkedStepIndices: number[];
  // Tryb pokazowy — gdy true, mutacje są otwarte dla wszystkich.
  isDemo: boolean;
  createdAt: string;
};

// Po przejściu na konta: tworzenie zwraca sam batch, bez kodu edycji.
export type CreateBatchResponse = { batch: BatchPublic };

export type CreateBatchInput = {
  name: string;
  startDate: string;
  recipeId?: string | null;
  instructionSteps?: string[];
};

export type BatchPatch = {
  stage?: BatchStage;
  startDate?: string;
  checkedStepIndices?: number[];
};

export async function createBatch(
  input: CreateBatchInput,
): Promise<CreateBatchResponse> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new BatchAuthError(401);
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawne dane nastawu"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się założyć nastawu");
  return res.json();
}

export async function fetchBatch(viewSlug: string): Promise<BatchPublic> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/batches/${viewSlug}`);
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (!res.ok) throw new Error("Nie udało się pobrać nastawu");
  return res.json();
}

// Lista MOICH nastawów — wymaga sesji. Backend zwraca { batches: [...] }.
export async function listMyBatches(): Promise<BatchPublic[]> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/batches?mine=true`);
  if (res.status === 401) throw new BatchAuthError(401);
  if (!res.ok) throw new Error("Nie udało się pobrać listy nastawów");
  const data = (await res.json()) as { batches: BatchPublic[] };
  return data.batches;
}

export async function updateBatch(
  viewSlug: string,
  patch: BatchPatch,
): Promise<BatchPublic> {
  const res = await fetchWithCookies(`${getApiBaseUrl()}/api/batches/${viewSlug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.status === 401) throw new BatchAuthError(401);
  if (res.status === 403) throw new BatchAuthError(403);
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (!res.ok) throw new Error("Nie udało się zapisać zmian");
  return res.json();
}

// ────────────────────────────────────────────────────────────────────────
// Pomiary nastawu
// ────────────────────────────────────────────────────────────────────────

export type Measurement = {
  id: string;
  batchId: string;
  measuredAt: string;
  brix: number | null;
  sg: number | null;
  temperatureC: number | null;
  note: string | null;
  createdAt: string;
};

export type CreateMeasurementInput = {
  measuredAt: string;
  brix?: number | null;
  sg?: number | null;
  temperatureC?: number | null;
  note?: string | null;
};

export async function fetchMeasurements(
  viewSlug: string,
): Promise<Measurement[]> {
  const res = await fetchWithCookies(
    `${getApiBaseUrl()}/api/batches/${viewSlug}/measurements`,
  );
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (!res.ok) throw new Error("Nie udało się pobrać pomiarów");
  return res.json();
}

export async function createMeasurement(
  viewSlug: string,
  input: CreateMeasurementInput,
): Promise<Measurement> {
  const res = await fetchWithCookies(
    `${getApiBaseUrl()}/api/batches/${viewSlug}/measurements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (res.status === 401) throw new BatchAuthError(401);
  if (res.status === 403) throw new BatchAuthError(403);
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawne dane pomiaru"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się zapisać pomiaru");
  return res.json();
}

// ────────────────────────────────────────────────────────────────────────
// Dziennik nastawu
// ────────────────────────────────────────────────────────────────────────

export type JournalEntry = {
  id: string;
  batchId: string;
  entryAt: string;
  body: string;
  photoKey: string | null;
  photoUrl: string | null;
  createdAt: string;
};

export type CreateJournalInput = {
  entryAt: string;
  body: string;
  photo?: File | null;
};

export async function fetchJournal(
  viewSlug: string,
): Promise<JournalEntry[]> {
  const res = await fetchWithCookies(
    `${getApiBaseUrl()}/api/batches/${viewSlug}/journal`,
  );
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (!res.ok) throw new Error("Nie udało się pobrać dziennika");
  return res.json();
}

export async function createJournalEntry(
  viewSlug: string,
  input: CreateJournalInput,
): Promise<JournalEntry> {
  const fd = new FormData();
  fd.append("entryAt", input.entryAt);
  fd.append("body", input.body);
  if (input.photo) fd.append("photo", input.photo);

  const res = await fetchWithCookies(
    `${getApiBaseUrl()}/api/batches/${viewSlug}/journal`,
    {
      method: "POST",
      body: fd,
    },
  );
  if (res.status === 401) throw new BatchAuthError(401);
  if (res.status === 403) throw new BatchAuthError(403);
  if (res.status === 404) throw new Error("Nie znaleziono nastawu");
  if (res.status === 400) {
    throw new ApiValidationError(
      await readErrorMessage(res, "Niepoprawne dane wpisu"),
    );
  }
  if (!res.ok) throw new Error("Nie udało się zapisać wpisu");
  return res.json();
}
