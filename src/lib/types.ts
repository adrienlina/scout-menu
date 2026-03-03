import type { Tables } from "@/integrations/supabase/types";

export type Menu = Tables<"menus"> & {
  menu_ingredients?: Ingredient[];
};

export type Ingredient = Tables<"menu_ingredients">;

export type Camp = Tables<"camps"> & {
  camp_meals?: CampMeal[];
};

export type CampMeal = Tables<"camp_meals"> & {
  menus?: Menu;
};

export type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  "dejeuner": "Déjeuner",
  "gouter": "Goûter",
  "diner": "Dîner",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  "petit-dejeuner": "☀️",
  "dejeuner": "🍽️",
  "gouter": "🍪",
  "diner": "🌙",
};
