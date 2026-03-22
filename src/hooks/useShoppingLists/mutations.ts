import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campId,
      name,
      campMealIds,
    }: {
      campId: string;
      name: string;
      campMealIds: string[];
    }) => {
      const { data: list, error } = await supabase
        .from("shopping_lists")
        .insert({ camp_id: campId, name })
        .select()
        .single();
      if (error) throw error;

      if (campMealIds.length > 0) {
        const { error: mealError } = await supabase
          .from("shopping_list_meals")
          .insert(campMealIds.map((id) => ({ shopping_list_id: list.id, camp_meal_id: id })));
        if (mealError) throw mealError;
      }

      return list;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["shopping_lists", vars.campId] });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, campId }: { listId: string; campId: string }) => {
      const { error } = await supabase.from("shopping_lists").delete().eq("id", listId);
      if (error) throw error;
      return campId;
    },
    onSuccess: (campId) => {
      queryClient.invalidateQueries({ queryKey: ["shopping_lists", campId] });
    },
  });
}

export function useToggleCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      ingredientKey,
      isChecked,
    }: {
      listId: string;
      ingredientKey: string;
      isChecked: boolean;
    }) => {
      const { error } = await supabase
        .from("shopping_list_checks")
        .upsert(
          { shopping_list_id: listId, ingredient_key: ingredientKey, is_checked: isChecked, updated_at: new Date().toISOString() },
          { onConflict: "shopping_list_id,ingredient_key" }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["shopping_list_checks", vars.listId] });
    },
  });
}
