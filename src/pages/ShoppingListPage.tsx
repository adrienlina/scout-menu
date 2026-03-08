import { useParams, useNavigate } from "react-router-dom";
import { useCamp } from "@/hooks/useCamps";
import {
  useShoppingList,
  useShoppingListMealIds,
  useShoppingListChecks,
  useToggleCheck,
} from "@/hooks/useShoppingLists";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { MEAL_TYPE_LABELS, type MealType, type Menu, getWeightedParticipants } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";

interface IngredientItem {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  menuName: string;
  date: string;
  mealType: MealType;
}

export default function ShoppingListPage() {
  const { campId, listId } = useParams<{ campId: string; listId: string }>();
  const navigate = useNavigate();
  const { data: camp } = useCamp(campId!);
  const { data: list } = useShoppingList(listId!);
  const { data: mealIds } = useShoppingListMealIds(listId!);
  const { data: checks } = useShoppingListChecks(listId!);
  const toggleCheck = useToggleCheck();

  const checkedMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    checks?.forEach((c) => (m[c.ingredient_key] = c.is_checked));
    return m;
  }, [checks]);

  // Build ingredient items from camp meals that are in this shopping list
  const items = useMemo(() => {
    if (!camp?.camp_meals || !mealIds) return [];
    const selectedMeals = camp.camp_meals.filter((m) => mealIds.includes(m.id));
    const result: IngredientItem[] = [];

    selectedMeals.forEach((meal) => {
      const menu = meal.menus as Menu | undefined;
      if (!menu?.menu_ingredients) return;
      const dayDate = meal.meal_date;
      const participants = getDayParticipants(camp, dayDate);

      menu.menu_ingredients.forEach((ing) => {
        result.push({
          key: `${meal.id}:${ing.id}`,
          name: ing.name,
          quantity: ing.quantity * participants,
          unit: ing.unit,
          menuName: menu.name,
          date: dayDate,
          mealType: meal.meal_type as MealType,
        });
      });
    });

    return result;
  }, [camp, mealIds]);

  const handleToggle = (key: string) => {
    toggleCheck.mutate({
      listId: listId!,
      ingredientKey: key,
      isChecked: !checkedMap[key],
    });
  };

  if (!list || !camp) {
    return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/camps/${campId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{list.name}</h1>
          <p className="text-sm text-muted-foreground">{camp.name}</p>
        </div>
      </div>

      <Tabs defaultValue="by-day">
        <TabsList>
          <TabsTrigger value="by-day">Par jour & menu</TabsTrigger>
          <TabsTrigger value="by-ingredient">Par ingrédient</TabsTrigger>
        </TabsList>

        <TabsContent value="by-day" className="space-y-4 mt-4">
          <ByDayView items={items} checkedMap={checkedMap} onToggle={handleToggle} />
        </TabsContent>

        <TabsContent value="by-ingredient" className="space-y-2 mt-4">
          <ByIngredientView items={items} checkedMap={checkedMap} onToggle={handleToggle} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getDayParticipants(camp: any, date: string): number {
  const campDay = camp.camp_days?.find((d: any) => d.day_date === date);
  return getWeightedParticipants(campDay, camp.participant_count);
}

function ByDayView({
  items,
  checkedMap,
  onToggle,
}: {
  items: IngredientItem[];
  checkedMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  // Group by date, then by menu
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

function ByIngredientView({
  items,
  checkedMap,
  onToggle,
}: {
  items: IngredientItem[];
  checkedMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  // Aggregate by ingredient name + unit
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

function CheckItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className={`text-sm transition-colors ${checked ? "line-through text-muted-foreground" : ""}`}>
        {label}
      </span>
    </label>
  );
}
