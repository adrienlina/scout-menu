import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NumberInput } from "@/components/NumberInput";
import { AgribalyseSearch } from "./AgribalyseSearch";
import type { IngredientRow } from "./types";
import type { TablesUpdate } from "@/integrations/supabase/types";

const UNITS = ["g", "kg", "ml", "L", "pièce"];

function getRatioForUnit(u: string) {
  if (u === "g") return 1;
  if (u === "kg") return 1000;
  return 1000;
}

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
  const [localName, setLocalName] = useState(ingredient.name);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
    queryClient.invalidateQueries({ queryKey: ["menus"] });
  };

  const deleteIng = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_ingredients").delete().eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateIngredient = useMutation({
    mutationFn: async (fields: TablesUpdate<"menu_ingredients">) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update(fields)
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const linkAgribalyse = useMutation({
    mutationFn: async (agriId: string | null) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ agribalyse_food_id: agriId })
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Aliment Agribalyse associé" });
    },
  });

  const updateMultiplier = useMutation({
    mutationFn: async (multiplier: number) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ unit_multiplier: multiplier })
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const handleNameBlur = () => {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== ingredient.name) {
      updateIngredient.mutate({ name: trimmed });
    } else {
      setLocalName(ingredient.name);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    updateIngredient.mutate({ unit: newUnit, unit_multiplier: getRatioForUnit(newUnit) });
  };

  let co2 = null;
  if (ingredient.changement_climatique !== null && ingredient.changement_climatique !== undefined) {
    co2 = ingredient.changement_climatique * ingredient.quantity * ingredient.unit_multiplier / 1000;
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {isOwner ? (
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            className="h-7 text-xs"
          />
        ) : (
          ingredient.name
        )}
      </TableCell>
      <TableCell>
        {isOwner ? (
          <NumberInput
            value={ingredient.quantity}
            onChange={(val) => updateIngredient.mutate({ quantity: val })}
            min={0}
            step="0.1"
            allowDecimals
            className="w-20"
          />
        ) : (
          ingredient.quantity
        )}
      </TableCell>
      <TableCell>
        {isOwner ? (
          <Select value={ingredient.unit} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-7 text-xs w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          ingredient.unit
        )}
      </TableCell>
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
          <span className="text-xs tabular-nums">{ingredient.unit_multiplier} g / {ingredient.unit}</span>
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
