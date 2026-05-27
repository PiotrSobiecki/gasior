import { describe, it, expect } from "vitest";
import { parseCommand, runCommand } from "./curation";
import { createInMemoryRecipeRepo } from "./repo.in-memory";

// Receptura, która przechodzi gate walidatora (verdict "pass").
// ABV: 2.04 kg cukru / 10 l = 204 g/l → 12% ABV (zgodne z targetAbv).
// Steps zawierają sanitację; aronia nie jest pestkowa.
const validRecord = {
  name: "Wino z aronii",
  fruit: "aronia",
  category: "wino" as const,
  fruitKg: 2,
  sugarKg: 2.04,
  waterL: 10,
  yeastType: "drożdże winiarskie",
  targetAbv: 12,
  fermentationDays: 30,
  steps: ["Umyj i zdezynfekuj sprzęt", "Rozgnieć owoce"],
  sourceUrls: ["https://example.com/aronia"],
};

describe("parseCommand", () => {
  it("parses an add command with a file", () => {
    expect(parseCommand(["add", "recipe.json"])).toEqual({
      ok: true,
      command: { action: "add", file: "recipe.json" },
    });
  });

  it("parses an update command with id and file", () => {
    expect(parseCommand(["update", "abc-123", "recipe.json"])).toEqual({
      ok: true,
      command: { action: "update", id: "abc-123", file: "recipe.json" },
    });
  });

  it("parses a delete command with id", () => {
    expect(parseCommand(["delete", "abc-123"])).toEqual({
      ok: true,
      command: { action: "delete", id: "abc-123" },
    });
  });

  it("rejects add without a file", () => {
    expect(parseCommand(["add"]).ok).toBe(false);
  });

  it("rejects update without id and file", () => {
    expect(parseCommand(["update", "abc-123"]).ok).toBe(false);
  });

  it("rejects delete without id", () => {
    expect(parseCommand(["delete"]).ok).toBe(false);
  });

  it("rejects an unknown command", () => {
    expect(parseCommand(["frobnicate"]).ok).toBe(false);
  });

  it("parses --force flag for add", () => {
    expect(parseCommand(["add", "recipe.json", "--force"])).toEqual({
      ok: true,
      command: { action: "add", file: "recipe.json", force: true },
    });
  });
});

describe("runCommand", () => {
  it("add: creates a recipe from the file", async () => {
    const repo = createInMemoryRecipeRepo();

    const res = await runCommand(
      { action: "add", file: "r.json" },
      { repo, readFile: () => validRecord },
    );

    expect(res.ok).toBe(true);
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("validated");
  });

  it("update: changes an existing recipe", async () => {
    const repo = createInMemoryRecipeRepo();
    const created = await repo.create({ ...validRecord, status: "validated" });

    const res = await runCommand(
      { action: "update", id: created.id, file: "r.json" },
      { repo, readFile: () => ({ ...validRecord, name: "Wino śliwkowe v2" }) },
    );

    expect(res.ok).toBe(true);
    const updated = await repo.getById(created.id);
    expect(updated?.name).toBe("Wino śliwkowe v2");
  });

  it("update: fails for an unknown id", async () => {
    const repo = createInMemoryRecipeRepo();

    const res = await runCommand(
      { action: "update", id: "missing", file: "r.json" },
      { repo, readFile: () => validRecord },
    );

    expect(res.ok).toBe(false);
  });

  it("delete: removes an existing recipe", async () => {
    const repo = createInMemoryRecipeRepo();
    const created = await repo.create({ ...validRecord, status: "validated" });

    const res = await runCommand(
      { action: "delete", id: created.id },
      { repo, readFile: () => validRecord },
    );

    expect(res.ok).toBe(true);
    expect(await repo.list()).toHaveLength(0);
  });

  it("delete: fails for an unknown id", async () => {
    const repo = createInMemoryRecipeRepo();

    const res = await runCommand(
      { action: "delete", id: "missing" },
      { repo, readFile: () => validRecord },
    );

    expect(res.ok).toBe(false);
  });

  it("add: rejects an invalid recipe file without writing", async () => {
    const repo = createInMemoryRecipeRepo();

    const res = await runCommand(
      { action: "add", file: "bad.json" },
      { repo, readFile: () => ({ name: "Bez proporcji" }) },
    );

    expect(res.ok).toBe(false);
    expect(await repo.list()).toHaveLength(0);
  });

  it("add: saves a recipe with pass verdict as validated", async () => {
    const repo = createInMemoryRecipeRepo();

    const res = await runCommand(
      { action: "add", file: "r.json" },
      { repo, readFile: () => validRecord },
    );

    expect(res.ok).toBe(true);
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("validated");
  });

  it("add: downgrades a recipe with warn verdict to draft", async () => {
    // Brak kroku sanitarnego → walidator zwróci warn (medium severity).
    const repo = createInMemoryRecipeRepo();
    const warnRecord = { ...validRecord, steps: ["Rozgnieć owoce"] };

    const res = await runCommand(
      { action: "add", file: "r.json" },
      { repo, readFile: () => warnRecord },
    );

    expect(res.ok).toBe(true);
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("draft");
  });

  it("add: rejects a recipe with fail verdict without writing", async () => {
    // Docelowe ABV > 20% → fail (high severity, poza zasięgiem fermentacji).
    const repo = createInMemoryRecipeRepo();
    const failRecord = { ...validRecord, sugarKg: 3.57, targetAbv: 21 };

    const res = await runCommand(
      { action: "add", file: "r.json" },
      { repo, readFile: () => failRecord },
    );

    expect(res.ok).toBe(false);
    expect(await repo.list()).toHaveLength(0);
  });

  it("add --force: saves a fail-verdict recipe as draft", async () => {
    const repo = createInMemoryRecipeRepo();
    const failRecord = { ...validRecord, sugarKg: 3.57, targetAbv: 21 };

    const res = await runCommand(
      { action: "add", file: "r.json", force: true },
      { repo, readFile: () => failRecord },
    );

    expect(res.ok).toBe(true);
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("draft");
  });
});
