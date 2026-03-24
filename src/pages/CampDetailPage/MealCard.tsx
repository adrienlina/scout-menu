import { useState } from "react";
import { useRemoveMeal } from "@/hooks/useCamps";
import { Draggable } from "@hello-pangea/dnd";
import { X, GripVertical, ClipboardCheck, Leaf, Trash2, AlertTriangle } from "lucide-react";
import { MealUsageDialog } from "@/components/MealUsageDialog";
import { getMenuCO2, type CampMeal, type Menu } from "@/lib/types";

export function MealCard({
  meal,
  menu,
  index,
  campId,
  participantCount,
}: {
  meal: CampMeal;
  menu: Menu;
  index: number;
  campId: string;
  participantCount: number;
}) {
  const removeMeal = useRemoveMeal();
  const [usageOpen, setUsageOpen] = useState(false);
  const portionsWasted = (meal as any).portions_wasted ?? 0;
  const portionsMissing = (meal as any).portions_missing ?? 0;

  return (
    <>
      <Draggable key={meal.id} draggableId={meal.id} index={index}>
        {(dragProvided, dragSnapshot) => (
          <div
            ref={dragProvided.innerRef}
            {...dragProvided.draggableProps}
            className={`space-y-1 rounded border p-2 transition-shadow ${
              dragSnapshot.isDragging ? "shadow-lg border-primary bg-background" : "bg-background"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-medium leading-tight truncate">{menu.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setUsageOpen(true)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Consommation"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => removeMeal.mutate(meal.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            {menu.menu_ingredients && menu.menu_ingredients.length > 0 && (
              <div className="space-y-0.5 pl-5">
                {menu.menu_ingredients.map((ing) => (
                  <p key={ing.id} className="text-xs text-muted-foreground">
                    {ing.name}: <span className="font-medium">{(ing.quantity * participantCount).toFixed(0)}{ing.unit}</span>
                  </p>
                ))}
              </div>
            )}
            {(() => {
              const co2 = getMenuCO2(menu, participantCount);
              return co2 > 0 ? (
                <div className="flex items-center gap-1 pl-5 pt-0.5">
                  <Leaf className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">{co2.toFixed(2)} kg CO₂</span>
                </div>
              ) : null;
            })()}
            {portionsWasted > 0 && (
              <div className="flex items-center gap-1 pl-5 pt-0.5">
                <Trash2 className="h-3 w-3 text-destructive/70" />
                <span className="text-xs text-muted-foreground">{portionsWasted} portion{portionsWasted > 1 ? "s" : ""} gâchée{portionsWasted > 1 ? "s" : ""}</span>
              </div>
            )}
            {portionsMissing > 0 && (
              <div className="flex items-center gap-1 pl-5 pt-0.5">
                <AlertTriangle className="h-3 w-3 text-amber-500/70" />
                <span className="text-xs text-muted-foreground">{portionsMissing} portion{portionsMissing > 1 ? "s" : ""} manquante{portionsMissing > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        )}
      </Draggable>
      <MealUsageDialog
        open={usageOpen}
        onOpenChange={setUsageOpen}
        campId={campId}
        campMealId={meal.id}
        menu={menu}
        participantCount={participantCount}
        currentPortionsWasted={portionsWasted}
        currentPortionsMissing={portionsMissing}
      />
    </>
  );
}