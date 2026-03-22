import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { ShoppingList, ShoppingListCheck } from "./types";

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
