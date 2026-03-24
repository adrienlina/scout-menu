import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/NumberInput";
import { useLogUsage, useIngredientUsage } from "@/hooks/useStock";
import { useUpdatePortionsWasted } from "@/hooks/useCamps";
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@/lib/types";
import { Check, Trash2, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface MealUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campMealId: string;
  menu: Menu;
  participantCount: number;
  currentPortionsWasted?: number;
  currentPortionsMissing?: number;
}

export function MealUsageDialog({
  open,
  onOpenChange,
  campId,
  campMealId,
  menu,
  participantCount,
  currentPortionsWasted = 0,
  currentPortionsMissing = 0,
}: MealUsageDialogProps) {
  const logUsage = useLogUsage();
  const updateWasted = useUpdatePortionsWasted();
  const { data: existingUsage } = useIngredientUsage(campId);
  const { toast } = useToast();
  const [portionsWasted, setPortionsWasted] = useState(0);
  const [portionsMissing, setPortionsMissing] = useState(0);

  const ingredients = menu.menu_ingredients || [];

  const [quantities, setQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    ingredients.forEach((ing) => {
      const existing = existingUsage?.find(
        (u) => u.camp_meal_id === campMealId && u.ingredient_name === ing.name && u.unit === ing.unit
      );
      if (existing) {
        initial[`${ing.name}:${ing.unit}`] = String(existing.quantity_used);
      } else {
        // Pre-fill with expected quantity
        initial[`${ing.name}:${ing.unit}`] = (ing.quantity * participantCount).toFixed(1);
      }
    });
    setQuantities(initial);
    setPortionsWasted(currentPortionsWasted);
    setPortionsMissing(currentPortionsMissing);
  }, [open, campMealId, existingUsage, ingredients, participantCount, currentPortionsWasted, currentPortionsMissing]);

  const handleSave = () => {
    const items = ingredients.map((ing) => ({
      ingredient_name: ing.name,
      quantity_used: parseFloat(quantities[`${ing.name}:${ing.unit}`] || "0") || 0,
      unit: ing.unit,
    }));

    updateWasted.mutate({ campMealId, portionsWasted });
    logUsage.mutate(
      { campId, campMealId, items },
      {
        onSuccess: () => {
          toast({ title: "Consommation enregistrée ✓" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
        },
      }
    );
  };

  const handleReset = () => {
    const initial: Record<string, string> = {};
    ingredients.forEach((ing) => {
      initial[`${ing.name}:${ing.unit}`] = (ing.quantity * participantCount).toFixed(1);
    });
    setQuantities(initial);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Consommation — {menu.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Indiquez les quantités réellement utilisées pour ce repas. Les valeurs préremplies correspondent aux quantités prévues.
        </p>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {ingredients.map((ing) => {
            const key = `${ing.name}:${ing.unit}`;
            const expected = (ing.quantity * participantCount).toFixed(1);
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ing.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prévu : {expected}{ing.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <NumberInput
                    value={parseFloat(quantities[key] || "0") || 0}
                    onChange={(val) =>
                      setQuantities((prev) => ({ ...prev, [key]: String(val) }))
                    }
                    min={0}
                    step="0.1"
                    allowDecimals
                    suffix={ing.unit}
                    className="w-24"
                  />
                </div>
              </div>
            );
          })}

          {ingredients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ce menu n'a pas d'ingrédients
            </p>
          )}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Trash2 className="h-4 w-4 text-destructive" />
            <Label className="text-sm font-medium">Gâchis</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Nombre de portions jetées après le repas
          </p>
          <NumberInput
            value={portionsWasted}
            onChange={setPortionsWasted}
            min={0}
            step="1"
            suffix="portions"
            className="w-32"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSave} disabled={logUsage.isPending}>
            {logUsage.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
