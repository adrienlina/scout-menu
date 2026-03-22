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
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@/lib/types";
import { Check } from "lucide-react";

interface MealUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campMealId: string;
  menu: Menu;
  participantCount: number;
}

export function MealUsageDialog({
  open,
  onOpenChange,
  campId,
  campMealId,
  menu,
  participantCount,
}: MealUsageDialogProps) {
  const logUsage = useLogUsage();
  const { data: existingUsage } = useIngredientUsage(campId);
  const { toast } = useToast();

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
  }, [open, campMealId, existingUsage, ingredients, participantCount]);

  const handleSave = () => {
    const items = ingredients.map((ing) => ({
      ingredient_name: ing.name,
      quantity_used: parseFloat(quantities[`${ing.name}:${ing.unit}`] || "0") || 0,
      unit: ing.unit,
    }));

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
                  <Input
                    type="number"
                    value={quantities[key] || ""}
                    onChange={(e) =>
                      setQuantities((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-20 h-8 text-sm text-right"
                    min={0}
                    step="0.1"
                  />
                  <span className="text-xs text-muted-foreground w-6">{ing.unit}</span>
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
