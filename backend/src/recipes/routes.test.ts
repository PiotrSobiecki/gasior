import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { createRecipesApp } from "./routes";
import { createInMemoryRecipeRepo } from "./repo.in-memory";
import type { Recipe } from "./repo";

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

describe("recipes API", () => {
  it("lists recipes as JSON", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([sample]);
  });

  it("returns a single recipe by id", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = createRecipesApp(() => repo);

    const res = await app.request(`/${sample.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sample);
  });

  it("returns 404 for an unknown recipe id", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = createRecipesApp(() => repo);

    const res = await app.request(`/${"0".repeat(8)}-0000-0000-0000-000000000000`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed id without querying the repo", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    repo.getById = async () => {
      throw new Error("repo nie powinno być odpytane dla zniekształconego id");
    };
    const app = createRecipesApp(() => repo);

    const res = await app.request("/not-a-uuid");

    expect(res.status).toBe(404);
  });

  it("filters list by ?fruit", async () => {
    const aronia: Recipe = { ...sample };
    const wisnia: Recipe = {
      ...sample,
      id: "22222222-2222-2222-2222-222222222222",
      name: "Nalewka z wiśni",
      fruit: "wiśnia",
      category: "nalewka",
    };
    const repo = createInMemoryRecipeRepo([aronia, wisnia]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?fruit=wi%C5%9Bnia");

    expect(res.status).toBe(200);
    const body = (await res.json()) as Recipe[];
    expect(body.map((r) => r.id)).toEqual([wisnia.id]);
  });

  it("filters list by ?category", async () => {
    const wino: Recipe = { ...sample };
    const cydr: Recipe = {
      ...sample,
      id: "33333333-3333-3333-3333-333333333333",
      name: "Cydr jabłkowy",
      fruit: "jabłko",
      category: "cydr",
    };
    const repo = createInMemoryRecipeRepo([wino, cydr]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?category=cydr");
    const body = (await res.json()) as Recipe[];

    expect(body.map((r) => r.id)).toEqual([cydr.id]);
  });

  it("filters list by ?minAbv and ?maxAbv (inclusive)", async () => {
    const low: Recipe = { ...sample, id: "10000000-0000-0000-0000-000000000000", targetAbv: 5 };
    const mid: Recipe = { ...sample, id: "20000000-0000-0000-0000-000000000000", targetAbv: 12 };
    const high: Recipe = { ...sample, id: "30000000-0000-0000-0000-000000000000", targetAbv: 18 };
    const repo = createInMemoryRecipeRepo([low, mid, high]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?minAbv=10&maxAbv=15");
    const body = (await res.json()) as Recipe[];

    expect(body.map((r) => r.id)).toEqual([mid.id]);
  });

  it("filters list by ?q text search across name and fruit", async () => {
    const aronia: Recipe = { ...sample };
    const malina: Recipe = {
      ...sample,
      id: "44444444-4444-4444-4444-444444444444",
      name: "Miód pitny malinowy",
      fruit: "malina",
      category: "miod",
    };
    const repo = createInMemoryRecipeRepo([aronia, malina]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?q=MALIN");
    const body = (await res.json()) as Recipe[];

    expect(body.map((r) => r.id)).toEqual([malina.id]);
  });

  it("combines filters and respects sort", async () => {
    const r1: Recipe = { ...sample, id: "a0000000-0000-0000-0000-000000000000", category: "wino", targetAbv: 14 };
    const r2: Recipe = { ...sample, id: "b0000000-0000-0000-0000-000000000000", category: "wino", targetAbv: 10 };
    const r3: Recipe = { ...sample, id: "c0000000-0000-0000-0000-000000000000", category: "nalewka", targetAbv: 12 };
    const repo = createInMemoryRecipeRepo([r1, r2, r3]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?category=wino&sort=abv-asc");
    const body = (await res.json()) as Recipe[];

    expect(body.map((r) => r.id)).toEqual([r2.id, r1.id]);
  });

  it("returns all recipes when no query params are provided", async () => {
    const a: Recipe = { ...sample };
    const b: Recipe = { ...sample, id: "55555555-5555-5555-5555-555555555555" };
    const repo = createInMemoryRecipeRepo([a, b]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/");
    const body = (await res.json()) as Recipe[];

    expect(body).toHaveLength(2);
  });

  it("returns an empty array (not 404) when filters match nothing", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/?fruit=ananas");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("creates recipe for logged user and forces status=draft", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("currentUser", {
        id: "u1",
        email: "ala@example.com",
        displayName: "Ala",
      });
      await next();
    });
    app.route("/", createRecipesApp(() => repo));

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Wino domowe z truskawki",
        fruit: "truskawka",
        category: "wino",
        fruitKg: 3,
        sugarKg: 1.8,
        waterL: 8,
        yeastType: "drożdże winiarskie",
        targetAbv: 12,
        fermentationDays: 28,
        steps: ["Zdezynfekuj sprzęt", "Nastaw fermentację"],
        sourceUrls: ["https://pl.wikipedia.org/wiki/Wino_owocowe"],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Recipe;
    expect(body.name).toBe("Wino domowe z truskawki");
    expect(body.status).toBe("draft");
  });

  it("blocks recipe creation for guest", async () => {
    const repo = createInMemoryRecipeRepo([sample]);
    const app = createRecipesApp(() => repo);

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Wino domowe",
        fruit: "truskawka",
        category: "wino",
        fruitKg: 1,
        sugarKg: 0.6,
        waterL: 3,
        yeastType: "drożdże",
        targetAbv: 11,
        fermentationDays: 21,
        steps: ["krok"],
        sourceUrls: ["https://pl.wikipedia.org/wiki/Wino_owocowe"],
      }),
    });

    expect(res.status).toBe(401);
  });
});
