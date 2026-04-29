import { useState } from "react";
import { useAssignMeal } from "@/hooks/useCamps";
import { useMenus } from "@/hooks/useMenus";
import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType, type CampMeal, type Menu } from "@/lib/types";
import { MealCard } from "./MealCard";

export function MealSlot({
  campId,
  date,
  mealType,
  meals,
  participantCount,
}: {
  campId: string;
  date: string;
  mealType: MealType;
  meals: CampMeal[];
  participantCount: number;
}) {
  const assignMeal = useAssignMeal();
  const menuFilter = (mealType === "dejeuner" || mealType === "diner") ? "repas" as const : mealType;
  const { data: menus } = useMenus(menuFilter);
  const [dialogOpen, setDialogOpen] = useState(false);
  const droppableId = `slot:${date}:${mealType}`;

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`rounded-lg border p-3 space-y-2 transition-colors ${
            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "bg-card/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {MEAL_TYPE_ICONS[mealType]} {MEAL_TYPE_LABELS[mealType]}
            </span>
          </div>

          {meals.map((meal, index) => {
            const menu = meal.menus as Menu | undefined;
            if (!menu) return null;
            return (
              <MealCard
                key={meal.id}
                meal={meal}
                menu={menu}
                index={index}
                campId={campId}
                participantCount={participantCount}
              />
            );
          })}

          {provided.placeholder}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-center rounded border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choisir un menu — {MEAL_TYPE_LABELS[mealType]}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {menus?.map((m) => (
                  <button
                    key={m.id}
                    className="w-full rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                    onClick={() => {
                      assignMeal.mutate({ campId, menuId: m.id, mealDate: date, mealType });
                      setDialogOpen(false);
                    }}
                  >
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </button>
                ))}
                {menus?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun menu disponible pour ce repas</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Droppable>
  );
}
