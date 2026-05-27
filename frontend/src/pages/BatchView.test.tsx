import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BatchView } from "./BatchView";
import {
  CURRENT_USER_QUERY_KEY,
} from "../hooks/useCurrentUser";
import type { BatchPublic, JournalEntry, Measurement, User } from "../lib/api";

const ALICE: User = {
  id: "alice",
  email: "ala@example.com",
  displayName: "Ala",
  status: "active",
  createdAt: "2026-05-25T18:00:00.000Z",
};

const BOB: User = {
  id: "bob",
  email: "bob@example.com",
  displayName: "Bob",
  status: "active",
  createdAt: "2026-05-25T18:00:00.000Z",
};

const sample: BatchPublic = {
  id: "b1",
  viewSlug: "slug1234567890",
  userId: ALICE.id,
  name: "Wino z aronii 2026",
  stage: "fermentacja-burzliwa",
  startDate: "2026-05-20",
  recipeId: null,
  instructionSteps: [],
  checkedStepIndices: [],
  isDemo: false,
  createdAt: "2026-05-25T18:00:00.000Z",
};

// Globalny "kim jestem" dla każdego testu — jest re-setowany w renderViewAs,
// żeby fetchMock /api/auth/me oddawał aktualnego usera (przy ewentualnym
// refetchu hooka useCurrentUser).
let currentTestUser: User | null = null;

// Mockuje fetch zwracając różne odpowiedzi w zależności od URL (regex).
// Pomocne gdy strona robi >1 zapytanie i kolejność nie jest deterministyczna
// (np. BatchView pobiera /api/batches/:slug i /api/batches/:slug/measurements
// równolegle). Dodatkowo zawsze obsługuje /api/auth/me (z bieżącym
// currentTestUser), żeby useCurrentUser w komponencie nigdy nie throwało.
function mockFetchByUrl(
  routes: Array<{
    match: RegExp;
    jsonBody: unknown;
    ok?: boolean;
    status?: number;
  }>,
) {
  type Route = {
    match: RegExp;
    jsonBody: unknown;
    ok?: boolean;
    status?: number;
  };
  const allRoutes: Route[] = [
    // Hook useCurrentUser może robić fetch nawet gdy mamy setQueryData
    // — zwracamy z fallbackiem bieżącego usera testu.
    {
      match: /\/api\/auth\/me$/,
      get jsonBody() {
        return { user: currentTestUser };
      },
    },
    ...routes,
  ];

  const fetchMock = vi
    .fn()
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const route = allRoutes.find((r) => r.match.test(url));
      if (!route) throw new Error(`Brak mocka dla URL: ${url}`);
      return {
        ok: route.ok ?? true,
        status: route.status ?? 200,
        json: async () => route.jsonBody,
      } as Response;
    });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Renderujemy z własnym QueryClientem, żeby móc wstrzyknąć currentUser do cache
// — zamiast mockować /api/auth/me w każdym teście.
function renderViewAs(
  slug: string,
  user: User | null,
  fetchOverride?: ReturnType<typeof mockFetchByUrl>,
) {
  currentTestUser = user;
  // gcTime musi być > 0 — z 0 dane wstawione przez setQueryData
  // znikają zanim nasz QueryClientProvider zdąży subskrybować.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  client.setQueryData(CURRENT_USER_QUERY_KEY, user);

  return {
    client,
    fetchOverride,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/nastaw/${slug}`]}>
          <Routes>
            <Route path="/nastaw/:viewSlug" element={<BatchView />} />
            <Route path="/logowanie" element={<div>STRONA LOGOWANIA</div>} />
            <Route path="/rejestracja" element={<div>STRONA REJESTRACJI</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe("BatchView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Domyślne mocki: nastaw + pusta lista pomiarów + pusty dziennik.
  function mockBatchWithMeasurements(
    batch: Partial<BatchPublic> | { error: true } = sample,
    measurements: Measurement[] = [],
    journal: JournalEntry[] = [],
  ) {
    if ("error" in batch && batch.error) {
      return mockFetchByUrl([
        {
          match: /\/api\/batches\/[^/]+$/,
          ok: false,
          status: 404,
          jsonBody: {},
        },
      ]);
    }
    return mockFetchByUrl([
      { match: /\/measurements$/, jsonBody: measurements },
      { match: /\/journal$/, jsonBody: journal },
      { match: /\/api\/batches\/[^/]+$/, jsonBody: { ...sample, ...batch } },
    ]);
  }

  it("pokazuje nazwę, etap i datę startu nastawu", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    expect(await screen.findByText(sample.name)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Fermentacja burzliwa/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/2026-05-20/).length).toBeGreaterThan(0);
  });

  it("pokazuje 'Nie znaleziono nastawu' dla 404", async () => {
    mockBatchWithMeasurements({ error: true });
    renderViewAs("brak", ALICE);

    const matches = await screen.findAllByText(/Nie znaleziono nastawu/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────────
  // Autoryzacja po sesji
  // ────────────────────────────────────────────────────────────────────

  it("guest widzi nastaw tylko do podglądu z CTA do logowania", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, null);

    await screen.findByText(sample.name);
    expect(
      screen.queryByRole("button", { name: /Zapisz zmiany/i }),
    ).toBeNull();
    expect(screen.getByText(/Tylko podgląd/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /zaloguj się/i }),
    ).toBeInTheDocument();
  });

  it("nie-właściciel (inny zalogowany) widzi tylko podgląd", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, BOB);

    await screen.findByText(sample.name);
    expect(
      screen.queryByRole("button", { name: /Zapisz zmiany/i }),
    ).toBeNull();
    expect(screen.getByText(/Tylko podgląd/i)).toBeInTheDocument();
    expect(screen.getByText(/innego użytkownika/i)).toBeInTheDocument();
  });

  it("właściciel widzi formularz edycji etapu i daty startu", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByText(sample.name);
    expect(
      await screen.findByRole("button", { name: /Zapisz zmiany/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Etap$/)).toBeInTheDocument();
  });

  it("właściciel zmieniający etap wysyła PATCH bez nagłówka X-Edit-Code", async () => {
    const fetchMock = mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByText(sample.name);
    fireEvent.change(screen.getByLabelText(/^Etap$/), {
      target: { value: "dojrzewanie" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz zmiany/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const init = patchCall![1] as RequestInit;
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers["X-Edit-Code"]).toBeUndefined();
      // Z `credentials: include`, bo backend autoryzuje po cookie sesji.
      expect(init.credentials).toBe("include");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Pomiary
  // ────────────────────────────────────────────────────────────────────

  function makeMeasurement(over: Partial<Measurement>): Measurement {
    return {
      id: crypto.randomUUID(),
      batchId: "b1",
      measuredAt: "2026-05-20T08:00:00.000Z",
      brix: null,
      sg: null,
      temperatureC: null,
      note: null,
      createdAt: "2026-05-20T08:00:00.000Z",
      ...over,
    };
  }

  it("pokazuje pustą oś czasu z hintem gdy brak pomiarów i wpisów", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    expect(
      await screen.findByText(/Jeszcze brak danych/i),
    ).toBeInTheDocument();
  });

  it("pokazuje pomiary chronologicznie (asc po dacie)", async () => {
    const measurements: Measurement[] = [
      makeMeasurement({
        measuredAt: "2026-05-20T08:00:00.000Z",
        sg: 1.09,
        note: "start",
      }),
      makeMeasurement({
        measuredAt: "2026-06-10T08:00:00.000Z",
        sg: 1.0,
        note: "koniec",
      }),
    ];
    mockBatchWithMeasurements(sample, measurements);
    renderViewAs(sample.viewSlug, ALICE);

    const items = await screen.findAllByTestId("timeline-event");
    expect(items.length).toBe(2);
    expect(items[0]).toHaveTextContent("start");
    expect(items[1]).toHaveTextContent("koniec");
  });

  it("liczy i pokazuje realne ABV gdy mamy >=2 pomiary z SG", async () => {
    const measurements: Measurement[] = [
      makeMeasurement({ measuredAt: "2026-05-20T08:00:00.000Z", sg: 1.09 }),
      makeMeasurement({ measuredAt: "2026-06-10T08:00:00.000Z", sg: 1.0 }),
    ];
    mockBatchWithMeasurements(sample, measurements);
    renderViewAs(sample.viewSlug, ALICE);

    expect(await screen.findByText(/11\.8\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/Realne ABV/i)).toBeInTheDocument();
  });

  it("nie pokazuje realnego ABV gdy mamy tylko jeden pomiar", async () => {
    const measurements: Measurement[] = [
      makeMeasurement({ measuredAt: "2026-05-20T08:00:00.000Z", sg: 1.09 }),
    ];
    mockBatchWithMeasurements(sample, measurements);
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findAllByTestId("measurement-row");
    expect(screen.queryByText(/Realne ABV/i)).toBeNull();
  });

  it("właściciel widzi formularz dodawania pomiaru", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });
    expect(
      screen.getByRole("button", { name: /Dodaj pomiar/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/SG \(gęstość/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blg/i)).toBeInTheDocument();
  });

  it("dodanie pomiaru SG wysyła POST z credentials i bez X-Edit-Code", async () => {
    const fetchMock = mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });

    fireEvent.change(screen.getByLabelText(/SG \(gęstość/i), {
      target: { value: "1.05" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dodaj pomiar/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          /\/measurements$/.test(String(url)) &&
          (init as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const init = postCall![1] as RequestInit;
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers["X-Edit-Code"]).toBeUndefined();
      expect(init.credentials).toBe("include");
      const body = JSON.parse(String(init.body));
      expect(body.sg).toBe(1.05);
    });
  });

  it("dodawanie pomiaru bez SG i bez Blg nie wysyła żądania", async () => {
    const fetchMock = mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });

    const initialCalls = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Dodaj pomiar/i }));

    await new Promise((r) => setTimeout(r, 20));
    const postsAfter = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(postsAfter.length).toBe(0);
    expect(fetchMock.mock.calls.length).toBe(initialCalls);
  });

  // ────────────────────────────────────────────────────────────────────
  // Dziennik
  // ────────────────────────────────────────────────────────────────────

  function makeEntry(over: Partial<JournalEntry>): JournalEntry {
    return {
      id: crypto.randomUUID(),
      batchId: "b1",
      entryAt: "2026-05-22T10:00:00.000Z",
      body: "smakuje świeżo",
      photoKey: null,
      photoUrl: null,
      createdAt: "2026-05-22T10:00:00.000Z",
      ...over,
    };
  }

  it("pokazuje wpisy dziennika z datą i treścią", async () => {
    const journal = [
      makeEntry({
        entryAt: "2026-05-22T10:00:00.000Z",
        body: "pierwszy bąbel",
      }),
      makeEntry({ entryAt: "2026-05-28T10:00:00.000Z", body: "klaruje się" }),
    ];
    mockBatchWithMeasurements(sample, [], journal);
    renderViewAs(sample.viewSlug, ALICE);

    expect(await screen.findByText("pierwszy bąbel")).toBeInTheDocument();
    expect(screen.getByText("klaruje się")).toBeInTheDocument();
  });

  it("wpis ze zdjęciem renderuje <img> z photoUrl", async () => {
    const journal = [
      makeEntry({
        body: "z mętem",
        photoKey: "batches/b1/photos/p.jpeg",
        photoUrl: "https://api.test/api/photos/batches/b1/photos/p.jpeg",
      }),
    ];
    mockBatchWithMeasurements(sample, [], journal);
    renderViewAs(sample.viewSlug, ALICE);

    const img = (await screen.findByAltText(
      /zdjęcie wpisu/i,
    )) as HTMLImageElement;
    expect(img.src).toContain("/api/photos/batches/b1/photos/p.jpeg");
  });

  it("właściciel widzi formularz dziennika", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });
    expect(
      screen.getByRole("button", { name: /Dodaj wpis/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Treść wpisu/i)).toBeInTheDocument();
  });

  it("dodanie wpisu wysyła multipart POST z credentials i bez X-Edit-Code", async () => {
    const fetchMock = mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });

    fireEvent.change(screen.getByLabelText(/Treść wpisu/i), {
      target: { value: "klaruje się" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dodaj wpis/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          /\/journal$/.test(String(url)) &&
          (init as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const init = postCall![1] as RequestInit;
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers["X-Edit-Code"]).toBeUndefined();
      expect(init.credentials).toBe("include");
      const body = init.body;
      expect(body).toBeInstanceOf(FormData);
      const fd = body as FormData;
      expect(fd.get("body")).toBe("klaruje się");
      expect(typeof fd.get("entryAt")).toBe("string");
    });
  });

  it("walidacja: pusty wpis nie wysyła żądania", async () => {
    const fetchMock = mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByRole("button", { name: /Zapisz zmiany/i });
    fireEvent.click(screen.getByRole("button", { name: /Dodaj wpis/i }));

    await new Promise((r) => setTimeout(r, 20));
    const journalPosts = fetchMock.mock.calls.filter(
      ([url, init]) =>
        /\/journal$/.test(String(url)) &&
        (init as RequestInit)?.method === "POST",
    );
    expect(journalPosts.length).toBe(0);
  });

  // ────────────────────────────────────────────────────────────────────
  // Tryb demo (publiczny, bez logowania)
  // ────────────────────────────────────────────────────────────────────

  it("nastaw isDemo=true pokazuje banner trybu pokazowego", async () => {
    mockBatchWithMeasurements({ ...sample, isDemo: true });
    renderViewAs(sample.viewSlug, null);

    await screen.findByText(sample.name);
    expect(screen.getByTestId("demo-banner")).toBeInTheDocument();
    expect(screen.getAllByText(/Tryb pokazowy/i).length).toBeGreaterThan(0);
  });

  it("nastaw isDemo=true włącza edycję dla gościa (bez logowania)", async () => {
    mockBatchWithMeasurements({ ...sample, isDemo: true });
    renderViewAs(sample.viewSlug, null);

    await screen.findByText(sample.name);
    expect(screen.getByLabelText(/^Etap$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Zapisz zmiany/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tylko podgląd/i)).toBeNull();
  });

  it("nastaw isDemo=true wysyła PATCH bez X-Edit-Code", async () => {
    const fetchMock = mockBatchWithMeasurements({ ...sample, isDemo: true });
    renderViewAs(sample.viewSlug, null);

    const stageSelect = (await screen.findByLabelText(
      /^Etap$/i,
    )) as HTMLSelectElement;
    fireEvent.change(stageSelect, { target: { value: "dojrzewanie" } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz zmiany/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const headers = ((patchCall![1] as RequestInit).headers ?? {}) as Record<
        string,
        string
      >;
      expect(headers["X-Edit-Code"]).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Nastaw z receptury + wskaźniki
  // ────────────────────────────────────────────────────────────────────

  const sampleRecipe = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Wino z aronii — sprawdzone",
    fruit: "aronia",
    category: "wino" as const,
    fruitKg: 4,
    sugarKg: 2,
    waterL: 8,
    yeastType: "Wine S",
    targetAbv: 12,
    fermentationDays: 14,
    steps: ["umyj owoce", "zasyp cukrem", "dodaj drożdże"],
    sourceUrls: ["https://example.org"],
    status: "validated" as const,
    createdAt: "2026-05-25T18:00:00.000Z",
  };

  function mockBatchWithRecipe(batch: Partial<BatchPublic> = sample) {
    return mockFetchByUrl([
      { match: /\/measurements$/, jsonBody: [] },
      { match: /\/journal$/, jsonBody: [] },
      { match: /\/api\/recipes\/[^/]+$/, jsonBody: sampleRecipe },
      {
        match: /\/api\/batches\/[^/]+$/,
        jsonBody: { ...sample, ...batch, recipeId: sampleRecipe.id },
      },
    ]);
  }

  it("nastaw z recipeId pokazuje sekcję 'Z receptury' z proporcjami i krokami", async () => {
    mockBatchWithRecipe();
    renderViewAs(sample.viewSlug, ALICE);

    expect(await screen.findByText(/Proporcje z receptury/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Wino z aronii — sprawdzone/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/8 l/i)).toBeInTheDocument();
    expect(screen.getByText(/Instrukcja krok po kroku/i)).toBeInTheDocument();
    expect(screen.getByText(/umyj owoce/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Krok 1/i })).toBeInTheDocument();
  });

  it("nastaw BEZ recipeId NIE pokazuje sekcji 'Z receptury'", async () => {
    mockBatchWithMeasurements();
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByText(sample.name);
    expect(screen.queryByText(/Proporcje z receptury/i)).toBeNull();
  });

  it("pokazuje sekcję 'Następne czynności' z etyką dla kolejnego etapu", async () => {
    mockBatchWithMeasurements({
      ...sample,
      stage: "fermentacja-burzliwa",
      startDate: new Date(Date.now() - 1 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10),
    });
    renderViewAs(sample.viewSlug, ALICE);

    expect(
      await screen.findByText(/Następne czynności/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Zlewanie/i)).toBeInTheDocument();
  });

  it("dla etapu 'butelkowanie' sekcja 'Następne czynności' jest pusta lub ukryta", async () => {
    mockBatchWithMeasurements({ ...sample, stage: "butelkowanie" });
    renderViewAs(sample.viewSlug, ALICE);

    await screen.findByText(sample.name);
    const headers = screen.queryAllByText(/Następne czynności/i);
    if (headers.length > 0) {
      expect(screen.queryByText(/Zlewanie znad osadu/i)).toBeNull();
      expect(screen.queryByText(/Przelanie do dojrzewania/i)).toBeNull();
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Wspólna oś czasu
  // ────────────────────────────────────────────────────────────────────

  it("oś czasu pokazuje pomiary i wpisy razem, chronologicznie", async () => {
    const measurements: Measurement[] = [
      makeMeasurement({
        measuredAt: "2026-05-20T08:00:00.000Z",
        sg: 1.09,
        note: "pomiar-start",
      }),
      makeMeasurement({
        measuredAt: "2026-06-10T08:00:00.000Z",
        sg: 1.0,
        note: "pomiar-koniec",
      }),
    ];
    const journal = [
      makeEntry({ entryAt: "2026-05-25T08:00:00.000Z", body: "wpis-srodek" }),
    ];
    mockBatchWithMeasurements(sample, measurements, journal);
    renderViewAs(sample.viewSlug, ALICE);

    const items = await screen.findAllByTestId("timeline-event");
    expect(items.length).toBe(3);
    expect(items[0]).toHaveTextContent(/pomiar-start/i);
    expect(items[1]).toHaveTextContent(/wpis-srodek/i);
    expect(items[2]).toHaveTextContent(/pomiar-koniec/i);
  });
});
