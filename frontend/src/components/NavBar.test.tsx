import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { NavBar } from "./NavBar";
import { CURRENT_USER_QUERY_KEY } from "../hooks/useCurrentUser";

function renderWith(user: object | null) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  // Wstawiamy odpowiedź /me oraz pustą listę nastawów ręcznie, żeby uniknąć
  // stuba fetcha — chcemy testować tylko renderowanie NavBaru, nie sieć.
  // NotificationBell pociąga useQuery(["my-batches"]) gdy user != null.
  client.setQueryData(CURRENT_USER_QUERY_KEY, user);
  client.setQueryData(["my-batches"], []);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ALICE = {
  id: "u1",
  email: "ala@example.com",
  displayName: "Ala",
  status: "active",
  createdAt: "2026-05-25T18:00:00.000Z",
};

describe("NavBar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("guest widzi Zaloguj i Załóż konto", () => {
    renderWith(null);
    expect(screen.getByRole("link", { name: /zaloguj/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /załóż konto/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /wyloguj/i }),
    ).not.toBeInTheDocument();
  });

  it("zalogowany user widzi Moje nastawy i Wyloguj zamiast logowania", () => {
    renderWith(ALICE);
    expect(
      screen.getByRole("link", { name: /moje nastawy/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wyloguj/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^zaloguj$/i }),
    ).not.toBeInTheDocument();
  });

  it("pokazuje kapsułkę z nazwą zalogowanego usera (displayName)", () => {
    renderWith(ALICE);
    const badge = screen.getByRole("link", { name: /Zalogowany jako Ala/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("href", "/moje-nastawy");
    expect(badge).toHaveTextContent("Ala");
    // Awatar z inicjałem.
    expect(badge).toHaveTextContent("A");
  });

  it("fallback do email-prefix gdy brak displayName", () => {
    renderWith({ ...ALICE, displayName: null, email: "kuba@example.com" });
    expect(
      screen.getByRole("link", { name: /Zalogowany jako kuba/i }),
    ).toBeInTheDocument();
  });
});
