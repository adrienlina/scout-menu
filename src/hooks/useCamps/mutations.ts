import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../useAuth";

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
      count_orange,
      count_bleu,
      count_rouge,
      count_adulte,
    }: {
      campId: string;
      dayDate: string;
      participantCount?: number;
      count_orange?: number;
      count_bleu?: number;
      count_rouge?: number;
      count_adulte?: number;
    }) => {
      const payload: any = { camp_id: campId, day_date: dayDate };
      if (participantCount !== undefined) payload.participant_count = participantCount;
      if (count_orange !== undefined) payload.count_orange = count_orange;
      if (count_bleu !== undefined) payload.count_bleu = count_bleu;
      if (count_rouge !== undefined) payload.count_rouge = count_rouge;
      if (count_adulte !== undefined) payload.count_adulte = count_adulte;

      const { error } = await supabase
        .from("camp_days")
        .upsert(payload, { onConflict: "camp_id,day_date" });

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}

export function useUpdatePortionsWasted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campMealId, portionsWasted }: { campMealId: string; portionsWasted: number }) => {
      const { error } = await supabase
        .from("camp_meals")
        .update({ portions_wasted: portionsWasted } as any)
        .eq("id", campMealId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["camps"] }),
  });
}
