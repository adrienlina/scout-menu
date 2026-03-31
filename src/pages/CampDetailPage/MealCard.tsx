import { useState } from "react";
import { useRemoveMeal } from "@/hooks/useCamps";
import { Draggable } from "@hello-pangea/dnd";
import { X, GripVertical, ClipboardCheck, Leaf, Trash2, AlertTriangle, Printer } from "lucide-react";
import { MealUsageDialog } from "@/components/MealUsageDialog";
import { getMenuCO2, MEAL_TYPE_LABELS, type CampMeal, type Menu, type MealType } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

function printMeal(meal: CampMeal, menu: Menu, participantCount: number) {
  const mealDate = format(parseISO(meal.meal_date), "EEEE d MMMM yyyy", { locale: fr });
  const mealLabel = MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type;
  const totalCO2 = getMenuCO2(menu, participantCount);

  const ingredientRows = (menu.menu_ingredients ?? []).map((ing) => {
    const cc = ing.agribalyse_foods?.changement_climatique;
    const co2 = cc ? (ing.quantity * cc * ing.unit_multiplier / 1000 * participantCount) : null;
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5">${ing.name}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${ing.quantity} ${ing.unit}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${(ing.quantity * participantCount).toFixed(1)} ${ing.unit}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${co2 !== null ? co2.toFixed(3) : "—"}</td>
    </tr>`;
  }).join("");

  const descriptionHtml = menu.description
    ? `<div style="margin-top:24px">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;color:#333">Recette pas à pas</h2>
        <div style="font-size:13px;line-height:1.6;color:#444">${menu.description}</div>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${menu.name} — ${mealDate}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding:32px; color:#222; max-width:800px; margin:0 auto; }
    h1 { font-size:22px; margin-bottom:4px; }
    .meta { font-size:14px; color:#666; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    thead th { padding:8px 10px; text-align:left; border-bottom:2px solid #333; font-weight:600; font-size:12px; text-transform:uppercase; color:#555; }
    thead th:not(:first-child) { text-align:right; }
    tfoot td { padding:8px 10px; border-top:2px solid #333; font-weight:700; }
    tfoot td:not(:first-child) { text-align:right; }
    img { max-width:100%; height:auto; border-radius:6px; margin:8px 0; }
    h2 { border-bottom:1px solid #ddd; padding-bottom:4px; }
    @media print {
      body { padding:16px; }
      @page { margin:1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${menu.name}</h1>
  <p class="meta">${mealDate} · ${mealLabel} · ${participantCount.toFixed(1)} portions</p>

  <table>
    <thead>
      <tr>
        <th>Ingrédient</th>
        <th>Par personne</th>
        <th>Total</th>
        <th>CO₂ (kg eq)</th>
      </tr>
    </thead>
    <tbody>${ingredientRows}</tbody>
    ${totalCO2 > 0 ? `<tfoot><tr>
      <td colspan="3">Total CO₂</td>
      <td style="text-align:right">${totalCO2.toFixed(3)} kg</td>
    </tr></tfoot>` : ""}
  </table>

  ${descriptionHtml}
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

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
                  onClick={() => printMeal(meal, menu, participantCount)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Imprimer"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
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