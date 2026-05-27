import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { RecipeList } from "./RecipeList";
import type { Recipe } from "../lib/api";

const sample: Recipe = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Wino z aronii",
  fruit: "aronia",
  category: "wino",
  fruitKg: 2,
  sugarKg: 1.6,
  waterL: 6,
  yeastType: "drożdże winiarskie",
  targetAbv: 12,
  fermentationDays: 30,
  steps: ["Rozgnieć owoce"],
  sourceUrls: ["https://example.com/aronia"],
  status: "validated",
  createdAt: "2026-05-21T00:00:00.000Z",
};

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RecipeList", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows a skeleton while loading", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );

    const { container } = renderWithProviders(<RecipeList />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders recipe cards from the API with status badge and proportions", async () => {
    mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />);

    expect(await screen.findByText("Wino z aronii")).toBeInTheDocument();
    expect(screen.getByText("zweryfikowana")).toBeInTheDocument();
    expect(screen.getByText("1.6 kg")).toBeInTheDocument();
    expect(screen.getByText("6 l")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("30 dni")).toBeInTheDocument();
  });

  it("links each card to its detail view", async () => {
    mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />);

    const card = await screen.findByRole("link", { name: /Wino z aronii/i });
    expect(card).toHaveAttribute("href", `/receptury/${sample.id}`);
  });

  it("shows an empty-state message when there are no recipes", async () => {
    mockFetchOnce({ jsonBody: [] });

    renderWithProviders(<RecipeList />);

    expect(await screen.findByText(/Brak receptur/i)).toBeInTheDocument();
  });

  it("shows an error message when the API fails", async () => {
    mockFetchOnce({ ok: false, status: 500, jsonBody: {} });

    renderWithProviders(<RecipeList />);

    await waitFor(() => {
      expect(
        screen.getByText(/Nie udało się pobrać receptur/i),
      ).toBeInTheDocument();
    });
  });

  it("forwards ?category from URL into the API request", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />, { path: "/?category=cydr" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("category=cydr");
  });

  it("forwards ?q text search from URL into the API request", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />, { path: "/?q=aronia" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("q=aronia");
  });

  it("fruit dropdown lists only Polish-spelled fruits, no ASCII aliases", async () => {
    mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />);

    const select = await screen.findByLabelText(/Filtr owocu/i);
    const optionLabels = Array.from(
      select.querySelectorAll("option"),
    ).map((o) => o.textContent);

    // Aliasy ASCII nie powinny mieszać się z kanonicznymi formami w UI.
    expect(optionLabels).toContain("jabłko");
    expect(optionLabels).not.toContain("jablko");
    expect(optionLabels).toContain("śliwka");
    expect(optionLabels).not.toContain("sliwka");
    expect(optionLabels).toContain("wiśnia");
    expect(optionLabels).not.toContain("wisnia");
  });

  it("forwards ?fruit from URL into the API request", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />, { path: "/?fruit=aronia" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("fruit=aronia");
  });

  it("forwards numeric ?minAbv and ?maxAbv from URL into the API request", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: [sample] });

    renderWithProviders(<RecipeList />, {
      path: "/?minAbv=10&maxAbv=14",
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("minAbv=10");
    expect(calledUrl).toContain("maxAbv=14");
  });

  it("shows a filter-aware empty state when filters return nothing", async () => {
    mockFetchOnce({ jsonBody: [] });

    renderWithProviders(<RecipeList />, { path: "/?category=cydr&q=ananas" });

    expect(
      await screen.findByText(/Brak receptur w wybranych filtrach/i),
    ).toBeInTheDocument();
  });
});
