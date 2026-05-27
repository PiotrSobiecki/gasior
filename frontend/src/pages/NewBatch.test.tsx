import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NewBatch } from "./NewBatch";

const responseBatch = {
  batch: {
    id: "b1",
    viewSlug: "slug1234567890",
    userId: "u1",
    name: "Wino z aronii 2026",
    stage: "fermentacja-burzliwa" as const,
    startDate: "2026-05-20",
    recipeId: null,
    instructionSteps: [],
    checkedStepIndices: [],
    isDemo: false,
    createdAt: "2026-05-25T18:00:00.000Z",
  },
};

// W tej stronie nie tylko renderujemy NewBatch — musimy też mieć cel
// `/nastaw/:viewSlug`, żeby zweryfikować redirect po sukcesie.
function renderApp(initialPath = "/nastawy/nowy") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/nastawy/nowy" element={<NewBatch />} />
          <Route
            path="/nastaw/:viewSlug"
            element={<div>WIDOK NASTAWU</div>}
          />
          <Route path="/logowanie" element={<div>STRONA LOGOWANIA</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockFetchOnce(body: unknown, ok = true, status = 201) {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("NewBatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("pokazuje formularz z polami nazwa i data startu", () => {
    renderApp();

    expect(screen.getByLabelText(/Nazwa nastawu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data startu/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Załóż nastaw/i }),
    ).toBeInTheDocument();
  });

  it("submit wysyła POST i redirectuje na /nastaw/:viewSlug", async () => {
    const fetchMock = mockFetchOnce(responseBatch);
    renderApp();

    fireEvent.change(screen.getByLabelText(/Nazwa nastawu/i), {
      target: { value: "Wino z aronii 2026" },
    });
    fireEvent.change(screen.getByLabelText(/Data startu/i), {
      target: { value: "2026-05-20" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));

    expect(await screen.findByText("WIDOK NASTAWU")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({
      name: "Wino z aronii 2026",
      startDate: "2026-05-20",
      recipeId: null,
    });
  });

  it("przy 401 (sesja wygasła) odsyła na /logowanie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );
    renderApp();

    fireEvent.change(screen.getByLabelText(/Nazwa nastawu/i), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByLabelText(/Data startu/i), {
      target: { value: "2026-05-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));

    expect(await screen.findByText("STRONA LOGOWANIA")).toBeInTheDocument();
  });

  it("nie da się wysłać pustego formularza", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it("pokazuje komunikat błędu z 400 (ApiValidationError) bez redirectu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Nazwa nastawu wymagana" }),
      } as Response),
    );
    renderApp();

    fireEvent.change(screen.getByLabelText(/Nazwa nastawu/i), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByLabelText(/Data startu/i), {
      target: { value: "2026-05-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /nazwa nastawu wymagana/i,
      ),
    );
    expect(screen.queryByText("WIDOK NASTAWU")).not.toBeInTheDocument();
  });

  // ─── Z receptury (Issue #07) ──────────────────────────────────────

  const recipeBody = {
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
    steps: ["umyj owoce", "zasyp cukrem"],
    sourceUrls: ["https://example.org"],
    status: "validated" as const,
    createdAt: "2026-05-25T18:00:00.000Z",
  };

  function mockFetchByUrl(
    routes: Array<{ match: RegExp; body: unknown; ok?: boolean; status?: number }>,
  ) {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const r = routes.find((x) => x.match.test(url));
      if (!r) throw new Error(`Brak mocka: ${url}`);
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        json: async () => r.body,
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("z ?recipeId w URL prefilluje nazwę z receptury", async () => {
    mockFetchByUrl([{ match: /\/api\/recipes\/11111111/, body: recipeBody }]);
    renderApp(`/nastawy/nowy?recipeId=${recipeBody.id}`);

    const nameInput = (await screen.findByLabelText(
      /Nazwa nastawu/i,
    )) as HTMLInputElement;
    await waitFor(() =>
      expect(nameInput.value).toMatch(/Wino z aronii — sprawdzone/i),
    );
  });

  it("z ?name w URL prefilluje nazwę bez receptury", async () => {
    renderApp("/nastawy/nowy?name=Cydr%20jab%C5%82kowy%20z%20kreatora");
    const input = screen.getByLabelText(/Nazwa nastawu/i) as HTMLInputElement;
    expect(input.value).toBe("Cydr jabłkowy z kreatora");
  });

  it("w ścieżce kreatora wysyła instructionSteps w POST", async () => {
    const fetchMock = mockFetchByUrl([
      { match: /\/api\/recipes\?/, body: [] },
      { match: /\/api\/batches$/, body: responseBatch, status: 201 },
    ]);
    renderApp(
      "/nastawy/nowy?name=Cydr%20z%20kreatora&type=cydr&fruit=jab%C5%82ko&waterL=10&targetAbv=6",
    );
    fireEvent.change(screen.getByLabelText(/Nazwa nastawu/i), {
      target: { value: "Cydr z kreatora" },
    });
    fireEvent.change(screen.getByLabelText(/Data startu/i), {
      target: { value: "2026-05-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));
    await screen.findByText("WIDOK NASTAWU");

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/api/batches") &&
        (init as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body.instructionSteps).toEqual(expect.any(Array));
    expect((body.instructionSteps as string[]).length).toBeGreaterThanOrEqual(6);
  });

  it("z ?recipeId wysyła recipeId w POST", async () => {
    const fetchMock = mockFetchByUrl([
      { match: /\/api\/recipes\/11111111/, body: recipeBody },
      {
        match: /\/api\/batches$/,
        body: {
          batch: { ...responseBatch.batch, recipeId: recipeBody.id },
        },
        status: 201,
      },
    ]);
    renderApp(`/nastawy/nowy?recipeId=${recipeBody.id}`);

    await waitFor(() => {
      const input = screen.getByLabelText(/Nazwa nastawu/i) as HTMLInputElement;
      expect(input.value.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Załóż nastaw/i }));

    await screen.findByText("WIDOK NASTAWU");
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        /\/api\/batches$/.test(String(url)) &&
        (init as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body.recipeId).toBe(recipeBody.id);
  });

  it("pokazuje sekcję 'Z receptury' z nazwą i proporcjami gdy ?recipeId", async () => {
    mockFetchByUrl([{ match: /\/api\/recipes\/11111111/, body: recipeBody }]);
    renderApp(`/nastawy/nowy?recipeId=${recipeBody.id}`);

    expect(await screen.findByText(/Z receptury/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Wino z aronii — sprawdzone/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/8 l/i)).toBeInTheDocument();
  });
});
