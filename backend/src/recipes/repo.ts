import type { RecipeCategory } from "./validation";

export type Recipe = {
  id: string;
  name: string;
  fruit: string;
  category: RecipeCategory;
  fruitKg: number;
  sugarKg: number;
  waterL: number;
  yeastType: string;
  targetAbv: number;
  fermentationDays: number;
  steps: string[];
  sourceUrls: string[];
  status: "draft" | "validated";
  createdAt: string;
};

export type RecipeInput = Omit<Recipe, "id" | "createdAt">;

export interface RecipeRepo {
  list(): Promise<Recipe[]>;
  getById(id: string): Promise<Recipe | null>;
  create(input: RecipeInput): Promise<Recipe>;
  update(id: string, input: RecipeInput): Promise<Recipe | null>;
  delete(id: string): Promise<boolean>;
}
