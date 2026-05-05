import type { Tables } from "@/integrations/supabase/types";

export type AgribalyseFood = Tables<"agribalyse_foods">;

export type Ingredient = Tables<"menu_ingredients"> & {
  agribalyse_foods?: AgribalyseFood | null;
};

export type Menu = Tables<"menus"> & {
  menu_ingredients?: Ingredient[];
};

export type CampDay = Tables<"camp_days">;

export type CampShare = Tables<"camp_shares">;

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
    return sum + ing.quantity * cc * ing.unit_multiplier / 1000 * participantCount;
  }, 0);
}

// "all" means the menu fits every meal slot (e.g. fruit, bread)
export type MealType = "breakfast" | "meal" | "snack" | "all";

// Concrete slot types used for camp day planning (excludes "all")
export type MealSlotType = Exclude<MealType, "all">;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  meal: "Déjeuner / Dîner",
  snack: "Goûter",
  all: "Tous repas",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "☀️",
  meal: "🍽️",
  snack: "🍪",
  all: "✨",
};

// Slot types used in camp day planning and shopping list
export const MEAL_SLOT_TYPES: MealSlotType[] = ["breakfast", "meal", "snack"];

// Filter types shown in the menus page (includes all 3 slots; "all" menus appear in every filter)
export const MENU_FILTER_TYPES: MealSlotType[] = ["breakfast", "meal", "snack"];

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
  const hasAgeGroups = day.count_orange > 0 || day.count_bleu > 0 || day.count_rouge > 0 || day.count_adulte > 0;
  if (!hasAgeGroups) return day.participant_count ?? fallbackCount;
  return AGE_GROUPS.reduce((sum, g) => sum + (day[g.key] ?? 0) * g.multiplier, 0);
}

/** Get age group counts from a camp day */
export function getAgeGroupCounts(day: CampDay | undefined): Record<string, number> {
  return {
    count_orange: day?.count_orange ?? 0,
    count_bleu: day?.count_bleu ?? 0,
    count_rouge: day?.count_rouge ?? 0,
    count_adulte: day?.count_adulte ?? 0,
  };
}
