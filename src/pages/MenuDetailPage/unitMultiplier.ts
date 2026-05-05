import { supabase } from "@/integrations/supabase/client";

export function getFallbackRatio(unit: string) {
  if (unit === "g") return 1;
  if (unit === "kg") return 1000;
  return 1000;
}

export async function resolveUnitMultiplier(
  agribalyseFoodId: string | null | undefined,
  unit: string,
): Promise<number> {
  if (agribalyseFoodId) {
    const { data } = await supabase
      .from("agribalyse_food_default_ratios")
      .select("grams_per_unit")
      .eq("agribalyse_food_id", agribalyseFoodId)
      .eq("unit", unit)
      .maybeSingle();
    if (data && data.grams_per_unit) return Number(data.grams_per_unit);
  }
  return getFallbackRatio(unit);
}
