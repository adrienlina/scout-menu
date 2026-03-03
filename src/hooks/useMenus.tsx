import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Menu, MealType } from "@/lib/types";

export function useMenus(mealType?: MealType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["menus", mealType, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("menus")
        .select("*, menu_ingredients(*)")
        .order("name");

      if (mealType) {
        query = query.eq("meal_type", mealType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Menu[];
    },
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      mealType,
      ingredients,
    }: {
      name: string;
      description: string;
      mealType: MealType;
      ingredients: { name: string; quantity: number; unit: string }[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .insert({ name, description, meal_type: mealType, user_id: user.id })
        .select()
        .single();

      if (menuError) throw menuError;

      if (ingredients.length > 0) {
        const { error: ingError } = await supabase
          .from("menu_ingredients")
          .insert(ingredients.map((i) => ({ ...i, menu_id: menu.id })));
        if (ingError) throw ingError;
      }

      return menu;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus"] }),
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menuId: string) => {
      const { error } = await supabase.from("menus").delete().eq("id", menuId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus"] }),
  });
}
