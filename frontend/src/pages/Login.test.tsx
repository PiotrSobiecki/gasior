import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Login } from "./Login";

function renderApp(initialPath = "/logowanie") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/logowanie" element={<Login />} />
          <Route path="/moje-nastawy" element={<div>MOJE NASTAWY</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Login page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("po sukcesie redirectuje na /moje-nastawy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: "u1",
            email: "ala@example.com",
            displayName: null,
            status: "active",
            createdAt: "2026-05-25T18:00:00.000Z",
          },
        }),
      } as Response),
    );

    renderApp();

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "ala@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Hasło/), {
      target: { value: "haslohaslo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /zaloguj/i }));

    expect(await screen.findByText("MOJE NASTAWY")).toBeInTheDocument();
  });

  it("pokazuje komunikat błędu z backendu przy 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Niepoprawny e-mail lub hasło" }),
      } as Response),
    );

    renderApp();

    fireEvent.change(screen.getByLabelText(/E-mail/), {
      target: { value: "ala@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Hasło/), {
      target: { value: "zle" },
    });
    fireEvent.click(screen.getByRole("button", { name: /zaloguj/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /niepoprawny e-mail lub hasło/i,
      ),
    );
  });
});
