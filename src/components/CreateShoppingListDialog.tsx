import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import { useCreateShoppingList } from "@/hooks/useShoppingLists";
import { MEAL_TYPE_LABELS, type MealType, type Camp, type CampMeal, type Menu } from "@/lib/types";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MEAL_TYPES: MealType[] = ["petit-dejeuner", "dejeuner", "gouter", "diner"];

export function CreateShoppingListDialog({ camp }: { camp: Camp }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Liste de courses");
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set());
  const createList = useCreateShoppingList();
  const navigate = useNavigate();
  const { toast } = useToast();

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: parseISO(camp.start_date),
        end: parseISO(camp.end_date),
      }),
    [camp.start_date, camp.end_date]
  );

  const getMealsForSlot = (date: string, mealType: MealType): CampMeal[] => {
    return camp.camp_meals?.filter((m) => m.meal_date === date && m.meal_type === mealType) || [];
  };

  const toggleMeal = (id: string) => {
    setSelectedMealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDay = (date: string) => {
    const dayMealIds = MEAL_TYPES.flatMap((t) => getMealsForSlot(date, t).map((m) => m.id));
    const allSelected = dayMealIds.every((id) => selectedMealIds.has(id));
    setSelectedMealIds((prev) => {
      const next = new Set(prev);
      dayMealIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const selectAll = () => {
    const allIds = camp.camp_meals?.map((m) => m.id) || [];
    const allSelected = allIds.every((id) => selectedMealIds.has(id));
    setSelectedMealIds(allSelected ? new Set() : new Set(allIds));
  };

  const handleCreate = async () => {
    if (selectedMealIds.size === 0) {
      toast({ title: "Sélectionne au moins un repas", variant: "destructive" });
      return;
    }
    const result = await createList.mutateAsync({
      campId: camp.id,
      name,
      campMealIds: [...selectedMealIds],
    });
    setOpen(false);
    navigate(`/camps/${camp.id}/liste/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSelectedMealIds(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Liste de courses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une liste de courses</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la liste"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sélectionner les repas</span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {camp.camp_meals?.every((m) => selectedMealIds.has(m.id)) ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
          </div>

          <div className="space-y-3">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayMeals = MEAL_TYPES.flatMap((t) => getMealsForSlot(dateStr, t));
              if (dayMeals.length === 0) return null;
              const allDaySelected = dayMeals.every((m) => selectedMealIds.has(m.id));

              return (
                <div key={dateStr} className="rounded-lg border p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allDaySelected}
                      onCheckedChange={() => toggleDay(dateStr)}
                    />
                    <span className="text-sm font-semibold capitalize">
                      {format(day, "EEEE d MMMM", { locale: fr })}
                    </span>
                  </label>

                  <div className="ml-6 space-y-1">
                    {MEAL_TYPES.map((type) => {
                      const meals = getMealsForSlot(dateStr, type);
                      return meals.map((meal) => {
                        const menu = meal.menus as Menu | undefined;
                        if (!menu) return null;
                        return (
                          <label key={meal.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedMealIds.has(meal.id)}
                              onCheckedChange={() => toggleMeal(meal.id)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {MEAL_TYPE_LABELS[type]}
                            </span>
                            <span className="text-sm">{menu.name}</span>
                          </label>
                        );
                      });
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleCreate} disabled={createList.isPending} className="w-full">
            Créer la liste ({selectedMealIds.size} repas)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
