import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import { RequireAuth } from "./RequireAuth";

function renderApp(initialPath: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/logowanie" element={<div>STRONA LOGOWANIA</div>} />
          <Route
            path="/moje-nastawy"
            element={
              <RequireAuth>
                <div>PRYWATNA STRONA</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RequireAuth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renderuje dzieci gdy /api/auth/me zwraca user-a", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: "u1",
            email: "ala@example.com",
            displayName: "Ala",
            status: "active",
            createdAt: "2026-05-25T18:00:00.000Z",
          },
        }),
      } as Response),
    );

    renderApp("/moje-nastawy");

    expect(await screen.findByText("PRYWATNA STRONA")).toBeInTheDocument();
  });

  it("redirectuje na /logowanie gdy /api/auth/me zwraca null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: null }),
      } as Response),
    );

    renderApp("/moje-nastawy");

    expect(await screen.findByText("STRONA LOGOWANIA")).toBeInTheDocument();
  });
});
