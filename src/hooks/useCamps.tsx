import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Camp } from "@/lib/types";

export function useCamps() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["camps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("*, camp_meals(*, menus(*, menu_ingredients(*))), camp_days(*)")
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
        .select("*, camp_meals(*, menus(*, menu_ingredients(*))), camp_days(*)")
        .eq("id", campId)
        .single();

      if (error) throw error;
      return data as Camp;
    },
    enabled: !!campId,
  });
}

export function useCreateCamp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      name,
      startDate,
      endDate,
      participantCount,
    }: {
      name: string;
      startDate: string;
      endDate: string;
      participantCount: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("camps")
        .insert({
          name,
          start_date: startDate,
          end_date: endDate,
          participant_count: participantCount,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useUpdateCamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      start_date?: string;
      end_date?: string;
      participant_count?: number;
    }) => {
      const { error } = await supabase.from("camps").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useDeleteCamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campId: string) => {
      const { error } = await supabase.from("camps").delete().eq("id", campId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useAssignMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campId,
      menuId,
      mealDate,
      mealType,
    }: {
      campId: string;
      menuId: string;
      mealDate: string;
      mealType: string;
    }) => {
      const { error } = await supabase
        .from("camp_meals")
        .insert({ camp_id: campId, menu_id: menuId, meal_date: mealDate, meal_type: mealType });

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useRemoveMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase
        .from("camp_meals")
        .delete()
        .eq("id", mealId);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useMoveMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mealId,
      mealDate,
      mealType,
    }: {
      mealId: string;
      mealDate: string;
      mealType: string;
    }) => {
      const { error } = await supabase
        .from("camp_meals")
        .update({ meal_date: mealDate, meal_type: mealType })
        .eq("id", mealId);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useUpsertCampDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campId,
      dayDate,
      participantCount,
    }: {
      campId: string;
      dayDate: string;
      participantCount: number;
    }) => {
      const { error } = await supabase
        .from("camp_days")
        .upsert(
          { camp_id: campId, day_date: dayDate, participant_count: participantCount },
          { onConflict: "camp_id,day_date" }
        );

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}
