import { useParams, useNavigate } from "react-router-dom";
import { useCamp } from "@/hooks/useCamps";
import {
  useShoppingList,
  useShoppingListMealIds,
  useShoppingListChecks,
  useToggleCheck,
} from "@/hooks/useShoppingLists";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { type Menu, type MealType, getWeightedParticipants } from "@/lib/types";
import { useMemo } from "react";
import { ByDayView } from "./ByDayView";
import { ByIngredientView } from "./ByIngredientView";
import type { IngredientItem } from "./types";

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

  const items = useMemo(() => {
    if (!camp?.camp_meals || !mealIds) return [];
    const selectedMeals = camp.camp_meals.filter((m) => mealIds.includes(m.id));
    const result: IngredientItem[] = [];

    selectedMeals.forEach((meal) => {
      const menu = meal.menus as Menu | undefined;
      if (!menu?.menu_ingredients) return;
      const dayDate = meal.meal_date;
      const campDay = camp.camp_days?.find((d) => d.day_date === dayDate);
      const participants = getWeightedParticipants(campDay, camp.participant_count);

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
