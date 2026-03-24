import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NumberInput } from "@/components/NumberInput";
import { AgribalyseSearch } from "./AgribalyseSearch";
import type { IngredientRow } from "./types";

export function IngredientTableRow({
  ingredient,
  isOwner,
  menuId,
}: {
  ingredient: IngredientRow;
  isOwner: boolean;
  menuId: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteIng = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_ingredients").delete().eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    },
  });

  const linkAgribalyse = useMutation({
    mutationFn: async (agriId: string | null) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ agribalyse_food_id: agriId } as any)
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      toast({ title: "Aliment Agribalyse associé" });
    },
  });

  const updateMultiplier = useMutation({
    mutationFn: async (multiplier: number) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ unit_multiplier: multiplier } as any)
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
    },
  });

  let co2 = null;
  if (ingredient.changement_climatique !== null && ingredient.changement_climatique !== undefined) {
    co2 = ingredient.changement_climatique * ingredient.quantity * ingredient.unit_multiplier / 1000;
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{ingredient.name}</TableCell>
      <TableCell>{ingredient.quantity}</TableCell>
      <TableCell>{ingredient.unit}</TableCell>
      <TableCell>
        {isOwner ? (
          <AgribalyseSearch
            currentId={ingredient.agribalyse_food_id}
            currentName={ingredient.agribalyse_name}
            onSelect={(id) => linkAgribalyse.mutate(id)}
            searchHint={ingredient.name}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {ingredient.agribalyse_name || "—"}
          </span>
        )}
      </TableCell>
      <TableCell>
        {isOwner ? (
          <NumberInput
            value={ingredient.unit_multiplier}
            onChange={(val) => updateMultiplier.mutate(val)}
            min={0}
            step="0.001"
            allowDecimals
            suffix={`g / ${ingredient.unit}`}
            className="w-32"
          />
        ) : (
          <span className="text-xs tabular-nums">{ingredient.unit_multiplier} {ingredient.unit} / kg</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {co2 !== null ? co2.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "—"}
      </TableCell>
      {isOwner && (
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => deleteIng.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
