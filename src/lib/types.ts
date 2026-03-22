import type { Tables } from "@/integrations/supabase/types";

export type AgribalyseFood = Tables<"agribalyse_foods">;

export type Ingredient = Tables<"menu_ingredients"> & {
  agribalyse_foods?: AgribalyseFood | null;
};

export type Menu = Tables<"menus"> & {
  menu_ingredients?: Ingredient[];
};

export type CampDay = Tables<"camp_days">;

export type Camp = Tables<"camps"> & {
  camp_meals?: CampMeal[];
  camp_days?: CampDay[];
};

export type CampMeal = Tables<"camp_meals"> & {
  menus?: Menu;
};

/** Compute CO2 (kg) for a single menu given a participant count */
export function getMenuCO2(menu: Menu | undefined, participantCount: number): number {
  if (!menu?.menu_ingredients) return 0;
  return menu.menu_ingredients.reduce((sum, ing) => {
    const cc = ing.agribalyse_foods?.changement_climatique;
    if (!cc) return sum;
    return sum + ing.quantity * ing.unit_multiplier * cc * participantCount;
  }, 0);
}

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

// Age groups with multipliers
export interface AgeGroup {
  key: "count_orange" | "count_bleu" | "count_rouge" | "count_adulte";
  label: string;
  ageRange: string;
  multiplier: number;
  color: string;
}

export const AGE_GROUPS: AgeGroup[] = [
  { key: "count_orange", label: "Oranges", ageRange: "< 11 ans", multiplier: 0.6, color: "text-orange-500" },
  { key: "count_bleu", label: "Bleus", ageRange: "11-14 ans", multiplier: 0.8, color: "text-blue-500" },
  { key: "count_rouge", label: "Rouges", ageRange: "14-17 ans", multiplier: 1.2, color: "text-red-500" },
  { key: "count_adulte", label: "Adultes", ageRange: "18+ ans", multiplier: 1.0, color: "text-foreground" },
];

/** Compute weighted participant count from age group counts on a camp day */
export function getWeightedParticipants(day: CampDay | undefined, fallbackCount: number): number {
  if (!day) return fallbackCount;
  const hasAgeGroups = (day as any).count_orange > 0 || (day as any).count_bleu > 0 || (day as any).count_rouge > 0 || (day as any).count_adulte > 0;
  if (!hasAgeGroups) return day.participant_count ?? fallbackCount;
  return AGE_GROUPS.reduce((sum, g) => sum + ((day as any)[g.key] ?? 0) * g.multiplier, 0);
}

/** Get age group counts from a camp day */
export function getAgeGroupCounts(day: CampDay | undefined): Record<string, number> {
  return {
    count_orange: (day as any)?.count_orange ?? 0,
    count_bleu: (day as any)?.count_bleu ?? 0,
    count_rouge: (day as any)?.count_rouge ?? 0,
    count_adulte: (day as any)?.count_adulte ?? 0,
  };
}
