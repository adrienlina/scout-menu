import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AgribalyseSearch } from "./AgribalyseSearch";
import { resolveUnitMultiplier } from "./unitMultiplier";
import type { TablesInsert } from "@/integrations/supabase/types";

export function AddIngredientForm({ menuId }: { menuId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  const [agriId, setAgriId] = useState<string | null>(null);
  const [agriName, setAgriName] = useState<string | null>(null);

  const addIng = useMutation({
    mutationFn: async () => {
      const insertData: TablesInsert<"menu_ingredients"> = {
        menu_id: menuId,
        name,
        quantity: parseFloat(qty),
        unit,
        unit_multiplier: await resolveUnitMultiplier(agriId, unit),
      };
      if (agriId) insertData.agribalyse_food_id = agriId;

      const { error } = await supabase.from("menu_ingredients").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      setName("");
      setQty("");
      setAgriId(null);
      setAgriName(null);
      toast({ title: "Ingrédient ajouté" });
    },
  });

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajouter un ingrédient</p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs">Nom</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pâtes" className="h-8 text-sm" />
        </div>
        <div className="w-20">
          <Label className="text-xs">Quantité</Label>
          <Input value={qty} onChange={e => setQty(e.target.value)} placeholder="100" type="number" step="0.1" className="h-8 text-sm" />
        </div>
        <div className="w-20">
          <Label className="text-xs">Unité</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["g", "kg", "ml", "L", "pièce"].map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs">Aliment Agribalyse</Label>
          <AgribalyseSearch
            currentId={agriId}
            currentName={agriName}
            onSelect={(id) => {
              setAgriId(id);
              if (!id) setAgriName(null);
            }}
            searchHint={name}
          />
        </div>
        <Button
          size="sm"
          className="h-8"
          disabled={!name || !qty || addIng.isPending}
          onClick={() => addIng.mutate()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
