import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ShoppingList {
  id: string;
  camp_id: string;
  name: string;
  created_at: string;
}

export interface ShoppingListCheck {
  id: string;
  shopping_list_id: string;
  ingredient_key: string;
  is_checked: boolean;
}

export function useShoppingLists(campId: string) {
  return useQuery({
    queryKey: ["shopping_lists", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("camp_id", campId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShoppingList[];
    },
    enabled: !!campId,
  });
}

export function useShoppingList(listId: string) {
  return useQuery({
    queryKey: ["shopping_list", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("id", listId)
        .single();
      if (error) throw error;
      return data as ShoppingList;
    },
    enabled: !!listId,
  });
}

export function useShoppingListMealIds(listId: string) {
  return useQuery({
    queryKey: ["shopping_list_meals", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_list_meals")
        .select("camp_meal_id")
        .eq("shopping_list_id", listId);
      if (error) throw error;
      return (data || []).map((d: any) => d.camp_meal_id as string);
    },
    enabled: !!listId,
  });
}

export function useShoppingListChecks(listId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["shopping_list_checks", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_list_checks")
        .select("*")
        .eq("shopping_list_id", listId);
      if (error) throw error;
      return data as ShoppingListCheck[];
    },
    enabled: !!listId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!listId) return;
    const channel = supabase
      .channel(`shopping_checks_${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list_checks",
          filter: `shopping_list_id=eq.${listId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shopping_list_checks", listId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, queryClient]);

  return query;
}

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
