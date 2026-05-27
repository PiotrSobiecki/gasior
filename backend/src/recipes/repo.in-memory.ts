import type { Recipe, RecipeRepo } from "./repo";

// In-memory implementacja repo — test double na granicy bazy danych.
export function createInMemoryRecipeRepo(initial: Recipe[] = []): RecipeRepo {
  const recipes = [...initial];
  return {
    async list() {
      return [...recipes];
    },
    async getById(id) {
      return recipes.find((r) => r.id === id) ?? null;
    },
    async create(input) {
      const recipe: Recipe = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      recipes.push(recipe);
      return recipe;
    },
    async update(id, input) {
      const idx = recipes.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      recipes[idx] = { ...recipes[idx], ...input };
      return recipes[idx];
    },
    async delete(id) {
      const idx = recipes.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      recipes.splice(idx, 1);
      return true;
    },
  };
}
