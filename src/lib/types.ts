import type { Tables } from "@/integrations/supabase/types";

export type Menu = Tables<"menus"> & {
  menu_ingredients?: Ingredient[];
};

export type Ingredient = Tables<"menu_ingredients">;

export type CampDay = Tables<"camp_days">;

export type Camp = Tables<"camps"> & {
  camp_meals?: CampMeal[];
  camp_days?: CampDay[];
};

export type CampMeal = Tables<"camp_meals"> & {
  menus?: Menu;
};

export type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";

// "repas" is a virtual type grouping dejeuner + diner for filtering/selection
export type MealTypeFilter = MealType | "repas";

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

// Filter categories shown in the menus page (merged déjeuner+dîner)
export const MEAL_FILTER_LABELS: Partial<Record<MealTypeFilter, string>> = {
  "petit-dejeuner": "Petit-déjeuner",
  "repas": "Repas (déj/dîner)",
  "gouter": "Goûter",
};

export const MEAL_FILTER_ICONS: Partial<Record<MealTypeFilter, string>> = {
  "petit-dejeuner": "☀️",
  "repas": "🍽️",
  "gouter": "🍪",
};

// Resolve a filter type to actual DB meal types
export function resolveMealTypes(filter: MealTypeFilter): MealType[] {
  if (filter === "repas") return ["dejeuner", "diner"];
  return [filter];
}

// Display filters for the menus page (excludes standalone dejeuner/diner)
export const MENU_FILTER_TYPES: MealTypeFilter[] = ["petit-dejeuner", "repas", "gouter"];
