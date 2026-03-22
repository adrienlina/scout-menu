import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckItem } from "./CheckItem";
import type { IngredientItem } from "./types";

export function ByIngredientView({
  items,
  checkedMap,
  onToggle,
}: {
  items: IngredientItem[];
  checkedMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; totalQty: number; keys: string[] }>();
    items.forEach((item) => {
      const aggKey = `${item.name.toLowerCase()}:${item.unit}`;
      if (!map.has(aggKey)) {
        map.set(aggKey, { name: item.name, unit: item.unit, totalQty: 0, keys: [] });
      }
      const entry = map.get(aggKey)!;
      entry.totalQty += item.quantity;
      entry.keys.push(item.key);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        {aggregated.map((agg) => {
          const allChecked = agg.keys.every((k) => checkedMap[k]);
          return (
            <CheckItem
              key={agg.name + agg.unit}
              label={`${agg.name} — ${agg.totalQty.toFixed(0)}${agg.unit}`}
              checked={allChecked}
              onToggle={() => {
                const newState = !allChecked;
                agg.keys.forEach((k) => {
                  if (checkedMap[k] !== newState) onToggle(k);
                });
              }}
            />
          );
        })}
        {aggregated.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucun ingrédient dans cette liste</p>
        )}
      </CardContent>
    </Card>
  );
}
