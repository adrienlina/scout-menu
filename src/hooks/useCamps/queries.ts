import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../useAuth";
import type { Camp } from "@/lib/types";

export function useCamps() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["camps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("*, camp_meals(*, menus(*, menu_ingredients(*, agribalyse_foods(*)))), camp_days(*)")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Camp[];
    },
    enabled: !!user,
  });
}

export function useCamp(campId: string) {
  return useQuery({
    queryKey: ["camps", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("*, camp_meals(*, menus(*, menu_ingredients(*, agribalyse_foods(*)))), camp_days(*)")
        .eq("id", campId)
        .single();

      if (error) throw error;
      return data as Camp;
    },
    enabled: !!campId,
  });
}
