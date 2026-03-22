import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckItem } from "./CheckItem";
import type { IngredientItem } from "./types";

export function ByDayView({
  items,
  checkedMap,
  onToggle,
}: {
  items: IngredientItem[];
  checkedMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, IngredientItem[]>>();
    items.forEach((item) => {
      if (!map.has(item.date)) map.set(item.date, new Map());
      const dateMap = map.get(item.date)!;
      const menuKey = `${item.mealType}:${item.menuName}`;
      if (!dateMap.has(menuKey)) dateMap.set(menuKey, []);
      dateMap.get(menuKey)!.push(item);
    });
    return map;
  }, [items]);

  const sortedDates = [...grouped.keys()].sort();

  return (
    <>
      {sortedDates.map((date) => (
        <Card key={date}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">
              {format(parseISO(date), "EEEE d MMMM", { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...grouped.get(date)!.entries()].map(([menuKey, menuItems]) => {
              const first = menuItems[0];
              return (
                <div key={menuKey} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {MEAL_TYPE_LABELS[first.mealType]} — {first.menuName}
                  </p>
                  {menuItems.map((item) => (
                    <CheckItem
                      key={item.key}
                      label={`${item.name} — ${item.quantity.toFixed(0)}${item.unit}`}
                      checked={!!checkedMap[item.key]}
                      onToggle={() => onToggle(item.key)}
                    />
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      {sortedDates.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucun ingrédient dans cette liste</p>
      )}
    </>
  );
}
