import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MyBatches } from "./MyBatches";
import { CURRENT_USER_QUERY_KEY } from "../hooks/useCurrentUser";
import type { BatchPublic, User } from "../lib/api";

const ALICE: User = {
  id: "alice",
  email: "ala@example.com",
  displayName: "Ala",
  status: "active",
  createdAt: "2026-05-25T18:00:00.000Z",
};

const batch1: BatchPublic = {
  id: "b1",
  viewSlug: "slug1nowy",
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

const batch2: BatchPublic = {
  ...batch1,
  id: "b2",
  viewSlug: "slug2zaaw",
  name: "Cydr jabłkowy testowy",
  stage: "dojrzewanie",
  startDate: "2026-03-01",
  isDemo: true,
};

function mockListMyBatches(batches: BatchPublic[] | { error: true }) {
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (/\/api\/auth\/me$/.test(url)) {
      return { ok: true, status: 200, json: async () => ({ user: ALICE }) } as Response;
    }
    if (/\/api\/batches\?mine=true$/.test(url)) {
      if ("error" in batches) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ batches }),
      } as Response;
    }
    throw new Error(`Brak mocka dla URL: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage(user: User | null = ALICE) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  client.setQueryData(CURRENT_USER_QUERY_KEY, user);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/moje-nastawy"]}>
        <Routes>
          <Route path="/moje-nastawy" element={<MyBatches />} />
          <Route path="/nastaw/:viewSlug" element={<div>STRONA NASTAWU</div>} />
          <Route path="/nastawy/nowy" element={<div>STRONA NOWY</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MyBatches", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("personalizuje nagłówek imieniem usera", async () => {
    mockListMyBatches([]);
    renderPage();
    expect(await screen.findByRole("heading", { name: /Cześć, Ala/i })).toBeInTheDocument();
  });

  it("pokazuje empty state gdy brak nastawów + CTA do założenia pierwszego", async () => {
    mockListMyBatches([]);
    renderPage();
    expect(
      await screen.findByText(/Pusto jak w gąsiorze/i),
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Załóż pierwszy nastaw/i });
    expect(cta).toHaveAttribute("href", "/nastawy/nowy");
  });

  it("renderuje listę nastawów z linkami do widoku i odpowiednim etapem", async () => {
    mockListMyBatches([batch1, batch2]);
    renderPage();

    const aronia = await screen.findByRole("link", { name: /Wino z aronii 2026/i });
    expect(aronia).toHaveAttribute("href", "/nastaw/slug1nowy");
    expect(aronia).toHaveTextContent(/Fermentacja burzliwa/i);

    const cydr = screen.getByRole("link", { name: /Cydr jabłkowy testowy/i });
    expect(cydr).toHaveAttribute("href", "/nastaw/slug2zaaw");
    expect(cydr).toHaveTextContent(/Dojrzewanie/i);
    // Demo-batch ma badge "Demo".
    expect(cydr).toHaveTextContent(/Demo/i);
  });

  it('zawsze pokazuje akcję „Załóż nowy" w hero', async () => {
    mockListMyBatches([batch1]);
    renderPage();
    const link = await screen.findByRole("link", { name: /\+ Załóż nowy/i });
    expect(link).toHaveAttribute("href", "/nastawy/nowy");
  });

  it("pokazuje błąd gdy fetch się sypie", async () => {
    mockListMyBatches({ error: true });
    renderPage();
    expect(
      await screen.findByText(/Nie udało się pobrać listy nastawów/i),
    ).toBeInTheDocument();
  });

  it('gdy brak displayName, pokazuje generyczny tytuł „Twoje nastawy"', async () => {
    mockListMyBatches([]);
    renderPage({ ...ALICE, displayName: null });
    expect(
      await screen.findByRole("heading", { name: /Twoje nastawy/i }),
    ).toBeInTheDocument();
  });
});
