import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Menu, MealType } from "@/lib/types";

export type MenuWithProfile = Menu & {
  creator_name?: string | null;
};

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

      // Fetch creator names for shared/default menus
      const userIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.display_name || ""]));
        }
      }

      return (data || []).map(m => ({
        ...m,
        creator_name: m.user_id ? profileMap[m.user_id] || null : null,
      })) as MenuWithProfile[];
    },
  });
}

export function useToggleShared() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuId, isShared }: { menuId: string; isShared: boolean }) => {
      const { error } = await supabase
        .from("menus")
        .update({ is_shared: isShared })
        .eq("id", menuId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus"] }),
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

export function useUpdateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      menuId,
      name,
      description,
      mealType,
      ingredients,
    }: {
      menuId: string;
      name: string;
      description: string;
      mealType: MealType;
      ingredients: { name: string; quantity: number; unit: string }[];
    }) => {
      const { error: menuError } = await supabase
        .from("menus")
        .update({ name, description, meal_type: mealType })
        .eq("id", menuId);
      if (menuError) throw menuError;

      // Replace all ingredients
      const { error: delError } = await supabase
        .from("menu_ingredients")
        .delete()
        .eq("menu_id", menuId);
      if (delError) throw delError;

      if (ingredients.length > 0) {
        const { error: ingError } = await supabase
          .from("menu_ingredients")
          .insert(ingredients.map((i) => ({ ...i, menu_id: menuId })));
        if (ingError) throw ingError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus"] }),
  });
}
