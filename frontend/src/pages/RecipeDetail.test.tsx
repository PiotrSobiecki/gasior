import { describe, it, expect, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { RecipeDetail } from "./RecipeDetail";
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
  steps: ["Rozgnieć owoce", "Dodaj drożdże"],
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

function renderDetail(id: string) {
  return renderWithProviders(<RecipeDetail />, {
    path: `/receptury/${id}`,
    routePattern: "/receptury/:id",
  });
}

describe("RecipeDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a skeleton while loading", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );

    const { container } = renderDetail(sample.id);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders all recipe fields: proportions, ABV, time, steps, sources", async () => {
    mockFetchOnce({ jsonBody: sample });

    renderDetail(sample.id);

    expect(await screen.findByText("Wino z aronii")).toBeInTheDocument();
    expect(screen.getByText("2 kg")).toBeInTheDocument();
    expect(screen.getByText("1.6 kg")).toBeInTheDocument();
    expect(screen.getByText("6 l")).toBeInTheDocument();
    expect(screen.getByText("drożdże winiarskie")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("30 dni")).toBeInTheDocument();
    expect(screen.getByText("Rozgnieć owoce")).toBeInTheDocument();
    expect(screen.getByText("Dodaj drożdże")).toBeInTheDocument();
    const sourceLink = screen.getByRole("link", {
      name: "https://example.com/aronia",
    });
    expect(sourceLink).toHaveAttribute("href", "https://example.com/aronia");
  });

  it("shows the validated badge for validated recipes", async () => {
    mockFetchOnce({ jsonBody: sample });

    renderDetail(sample.id);

    expect(await screen.findByText("zweryfikowana")).toBeInTheDocument();
  });

  it("shows the draft badge for draft recipes", async () => {
    mockFetchOnce({ jsonBody: { ...sample, status: "draft" } });

    renderDetail(sample.id);

    expect(await screen.findByText("szkic")).toBeInTheDocument();
  });

  it("shows an error message when the recipe is not found", async () => {
    mockFetchOnce({ ok: false, status: 404, jsonBody: {} });

    renderDetail(sample.id);

    const matches = await screen.findAllByText(/Nie znaleziono receptury/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows a safety warning for stone-fruit recipes without a pit instruction", async () => {
    mockFetchOnce({
      jsonBody: {
        ...sample,
        fruit: "wiśnia",
        category: "nalewka",
        steps: ["Umyj sprzęt", "Rozgnieć wiśnie razem ze skórką"],
      },
    });

    renderDetail(sample.id);

    const matches = await screen.findAllByText(/amigdalin|pestk/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows 'Załóż nastaw z tej receptury' link with correct ?recipeId", async () => {
    mockFetchOnce({ jsonBody: sample });
    renderDetail(sample.id);

    const link = (await screen.findByRole("link", {
      name: /Za\u0142\u00f3\u017c nastaw z tej receptury/i,
    })) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      `/nastawy/nowy?recipeId=${sample.id}`,
    );
  });

  it("does not show a safety warning when steps mention drylowanie", async () => {
    mockFetchOnce({
      jsonBody: {
        ...sample,
        fruit: "wiśnia",
        category: "nalewka",
        steps: [
          "Umyj i wyparz sprzęt",
          "Wydryluj wiśnie — nie rozgniataj pestek",
        ],
      },
    });

    renderDetail(sample.id);

    await screen.findByText("Wino z aronii");
    expect(screen.queryByText(/amigdalin/i)).toBeNull();
  });
});
