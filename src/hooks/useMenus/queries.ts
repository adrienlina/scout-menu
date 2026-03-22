import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../useAuth";
import type { Menu, MealTypeFilter } from "@/lib/types";
import { resolveMealTypes } from "@/lib/types";

export type MenuWithProfile = Menu & {
  creator_name?: string | null;
};

export function useMenus(mealTypeFilter?: MealTypeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["menus", mealTypeFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("menus")
        .select("*, menu_ingredients(*)")
        .order("name");

      if (mealTypeFilter) {
        const types = resolveMealTypes(mealTypeFilter);
        query = query.in("meal_type", types);
      }

      const { data, error } = await query;
      if (error) throw error;

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
