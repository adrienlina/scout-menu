export type IngredientRow = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_multiplier: number;
  agribalyse_food_id: string | null;
  agribalyse_name?: string | null;
  changement_climatique?: number | null;
};
