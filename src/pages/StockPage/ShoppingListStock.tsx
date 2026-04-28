import { useMemo } from "react";
import { useShoppingListChecks, useShoppingListMealIds } from "@/hooks/useShoppingLists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { getWeightedParticipants, type Menu, type Camp, type CampMeal } from "@/lib/types";
import type { Tables } from "@/integrations/supabase/types";
import type { StockItem } from "./types";

type CampIngredientUsage = Tables<"camp_ingredient_usage">;

export function ShoppingListStock({
  listId,
  listName,
  camp,
  usage,
}: {
  listId: string;
  listName: string;
  camp: Camp;
  usage: CampIngredientUsage[];
}) {
  const { data: checks } = useShoppingListChecks(listId);
  const { data: mealIds } = useShoppingListMealIds(listId);

  const stockItems = useMemo(() => {
    if (!camp?.camp_meals || !mealIds || !checks) return [];

    const checkedKeys = new Set(
      checks.filter((c) => c.is_checked).map((c) => c.ingredient_key)
    );

    const selectedMeals = camp.camp_meals.filter((m) => mealIds.includes(m.id));

    const purchasedMap = new Map<string, { name: string; unit: string; qty: number }>();

    selectedMeals.forEach((meal: CampMeal) => {
      const menu = meal.menus as Menu | undefined;
      if (!menu?.menu_ingredients) return;
      const campDay = camp.camp_days?.find((d) => d.day_date === meal.meal_date);
      const participants = getWeightedParticipants(campDay, camp.participant_count);

      menu.menu_ingredients.forEach((ing) => {
        const key = `${meal.id}:${ing.id}`;
        if (!checkedKeys.has(key)) return;
        const aggKey = `${ing.name.toLowerCase()}:${ing.unit}`;
        if (!purchasedMap.has(aggKey)) {
          purchasedMap.set(aggKey, { name: ing.name, unit: ing.unit, qty: 0 });
        }
        purchasedMap.get(aggKey)!.qty += ing.quantity * participants;
      });
    });

    const usedMap = new Map<string, number>();
    usage.forEach((u) => {
      const aggKey = `${u.ingredient_name.toLowerCase()}:${u.unit}`;
      usedMap.set(aggKey, (usedMap.get(aggKey) || 0) + u.quantity_used);
    });

    const items: StockItem[] = [];
    purchasedMap.forEach((val, aggKey) => {
      const usedQty = usedMap.get(aggKey) || 0;
      items.push({
        name: val.name,
        unit: val.unit,
        purchased: val.qty,
        used: usedQty,
        remaining: val.qty - usedQty,
      });
    });

    usedMap.forEach((usedQty, aggKey) => {
      if (!purchasedMap.has(aggKey)) {
        const [name, unit] = aggKey.split(":");
        items.push({ name, unit, purchased: 0, used: usedQty, remaining: -usedQty });
      }
    });

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [camp, mealIds, checks, usage]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📋 {listName}</CardTitle>
      </CardHeader>
      <CardContent>
        {stockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun ingrédient coché dans cette liste
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
              <span>Ingrédient</span>
              <span className="w-20 text-right flex items-center justify-end gap-1">
                <TrendingUp className="h-3 w-3" /> Acheté
              </span>
              <span className="w-20 text-right flex items-center justify-end gap-1">
                <TrendingDown className="h-3 w-3" /> Utilisé
              </span>
              <span className="w-20 text-right">Restant</span>
            </div>
            {stockItems.map((item) => (
              <div
                key={`${item.name}:${item.unit}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-sm"
              >
                <span className="truncate">
                  {item.name} <span className="text-muted-foreground text-xs">({item.unit})</span>
                </span>
                <span className="w-20 text-right font-medium text-primary">
                  {item.purchased.toFixed(0)}
                </span>
                <span className="w-20 text-right font-medium text-destructive">
                  {item.used.toFixed(0)}
                </span>
                <span className="w-20 text-right">
                  <Badge
                    variant={item.remaining > 0 ? "secondary" : item.remaining === 0 ? "outline" : "destructive"}
                    className="text-xs font-mono"
                  >
                    {item.remaining.toFixed(0)}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
