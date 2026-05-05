import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useBookmarks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_bookmarks")
        .select("menu_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.menu_id));
    },
  });
}

export function useToggleBookmark() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuId, bookmarked }: { menuId: string; bookmarked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (bookmarked) {
        const { error } = await supabase
          .from("menu_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("menu_id", menuId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menu_bookmarks")
          .insert({ user_id: user.id, menu_id: menuId });
        if (error) throw error;
      }
    },
    onMutate: async ({ menuId, bookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks", user?.id] });
      const prev = queryClient.getQueryData<Set<string>>(["bookmarks", user?.id]);
      queryClient.setQueryData<Set<string>>(["bookmarks", user?.id], (old) => {
        const next = new Set(old);
        if (bookmarked) next.delete(menuId);
        else next.add(menuId);
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["bookmarks", user?.id], ctx?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
  });
}
