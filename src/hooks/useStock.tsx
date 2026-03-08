import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IngredientUsage {
  id: string;
  camp_id: string;
  camp_meal_id: string | null;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  created_at: string;
}

export function useIngredientUsage(campId: string) {
  return useQuery({
    queryKey: ["ingredient_usage", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camp_ingredient_usage")
        .select("*")
        .eq("camp_id", campId);
      if (error) throw error;
      return data as IngredientUsage[];
    },
    enabled: !!campId,
  });
}

export function useLogUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campId,
      campMealId,
      items,
    }: {
      campId: string;
      campMealId: string;
      items: { ingredient_name: string; quantity_used: number; unit: string }[];
    }) => {
      // Delete existing usage for this meal, then insert new
      await supabase
        .from("camp_ingredient_usage")
        .delete()
        .eq("camp_id", campId)
        .eq("camp_meal_id", campMealId);

      if (items.length > 0) {
        const rows = items
          .filter((i) => i.quantity_used > 0)
          .map((i) => ({
            camp_id: campId,
            camp_meal_id: campMealId,
            ingredient_name: i.ingredient_name,
            quantity_used: i.quantity_used,
            unit: i.unit,
          }));

        if (rows.length > 0) {
          const { error } = await supabase
            .from("camp_ingredient_usage")
            .insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ingredient_usage", vars.campId] });
    },
  });
}
