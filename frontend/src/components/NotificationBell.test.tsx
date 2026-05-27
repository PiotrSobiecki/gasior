import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { CURRENT_USER_QUERY_KEY } from "../hooks/useCurrentUser";
import type { BatchPublic, User } from "../lib/api";

const ALICE: User = {
  id: "alice",
  email: "ala@example.com",
  displayName: "Ala",
  status: "active",
  createdAt: "2026-05-25T18:00:00.000Z",
};

function mkBatch(overrides: Partial<BatchPublic>): BatchPublic {
  return {
    id: "b",
    viewSlug: "slug",
    userId: ALICE.id,
    name: "Nastaw",
    stage: "fermentacja-burzliwa",
    startDate: "2026-05-01",
    recipeId: null,
    instructionSteps: [],
    checkedStepIndices: [],
    isDemo: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockBatchesFetch(batches: BatchPublic[]) {
  const fetchMock = vi
    .fn()
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/api\/auth\/me$/.test(url)) {
        return { ok: true, status: 200, json: async () => ({ user: ALICE }) } as Response;
      }
      if (/\/api\/batches\?mine=true$/.test(url)) {
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

function renderBell(user: User | null = ALICE) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  client.setQueryData(CURRENT_USER_QUERY_KEY, user);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    // Zamrażamy tylko Date (a NIE setTimeout/Promise) — inaczej TanStack
    // Query nie resolvuje fetcha i każdy test pada na timeoucie.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("nie pokazuje badge'a gdy brak pilnych powiadomień", async () => {
    mockBatchesFetch([
      // Start wczoraj — następna akcja za 6 dni, poza progiem 3 dni.
      mkBatch({ startDate: "2026-05-09" }),
    ]);
    renderBell();
    const btn = await screen.findByRole("button", {
      name: /Powiadomienia \(brak nowych\)/i,
    });
    expect(btn).toBeInTheDocument();
    // Nic poza ikoną dzwoneczka — brak badge'a z liczbą.
    expect(btn.textContent).not.toMatch(/[1-9]/);
  });

  it("pokazuje badge z liczbą i kolorem czerwonym gdy są zaległe akcje", async () => {
    mockBatchesFetch([
      mkBatch({ id: "1", startDate: "2026-04-25", name: "Stara aronia" }),
      mkBatch({ id: "2", startDate: "2026-05-03", name: "Dzisiejsze wino" }),
    ]);
    renderBell();
    const btn = await screen.findByRole("button", {
      name: /Powiadomienia \(2\)/i,
    });
    expect(btn).toBeInTheDocument();
    // Badge urgent → klasa bg-red-500.
    expect(btn.innerHTML).toContain("bg-red-500");
  });

  it("rozwija dropdown po kliknięciu i pokazuje listę z linkami", async () => {
    mockBatchesFetch([
      mkBatch({ id: "1", startDate: "2026-05-03", name: "Cydr testowy", viewSlug: "abc-slug" }),
    ]);
    renderBell();

    const btn = await screen.findByRole("button", { name: /Powiadomienia/i });
    fireEvent.click(btn);

    const link = await screen.findByRole("menuitem");
    expect(link).toHaveTextContent(/Cydr testowy/i);
    expect(link).toHaveTextContent(/Zlewanie znad osadu/i);
    expect(link).toHaveTextContent(/dziś/i);
    expect(link).toHaveAttribute("href", "/nastaw/abc-slug");
  });

  it("po kliknięciu w link dropdown się zamyka", async () => {
    mockBatchesFetch([
      mkBatch({ id: "1", startDate: "2026-05-03", name: "X" }),
    ]);
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: /Powiadomienia/i }));
    const link = await screen.findByRole("menuitem");
    fireEvent.click(link);
    // Po klik dropdown znika.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("klawisz Escape zamyka dropdown", async () => {
    mockBatchesFetch([mkBatch({ id: "1", startDate: "2026-05-03" })]);
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: /Powiadomienia/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("dla guesta nie wywołuje fetchu listy nastawów", async () => {
    const fetchMock = mockBatchesFetch([]);
    renderBell(null);
    // Tylko fetch może zostać wywołany do /api/auth/me (z innych miejsc),
    // ale my w komponencie używamy go tylko poprzez setQueryData → bez fetchu.
    // Ważne: nie ma POST/GET na /api/batches.
    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => /\/api\/batches/.test(u))).toBe(false);
  });
});
