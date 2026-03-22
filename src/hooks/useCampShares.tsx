import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCampShares(campId: string) {
  return useQuery({
    queryKey: ["camp_shares", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camp_shares")
        .select("*")
        .eq("camp_id", campId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!campId,
  });
}

export function useAddCampShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campId, email, sharedByUserId }: { campId: string; email: string; sharedByUserId: string }) => {
      const { error } = await supabase
        .from("camp_shares")
        .insert({ camp_id: campId, invited_email: email.toLowerCase().trim(), shared_by_user_id: sharedByUserId });
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["camp_shares", vars.campId] }),
  });
}

export function useRemoveCampShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campId }: { id: string; campId: string }) => {
      const { error } = await supabase.from("camp_shares").delete().eq("id", id);
      if (error) throw error;
      return campId;
    },
    onSuccess: (campId) => queryClient.invalidateQueries({ queryKey: ["camp_shares", campId] }),
  });
}
