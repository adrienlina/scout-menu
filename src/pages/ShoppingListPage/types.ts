import type { MealType } from "@/lib/types";

export interface IngredientItem {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  menuName: string;
  date: string;
  mealType: MealType;
}
