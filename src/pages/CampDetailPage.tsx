import { useParams, useNavigate } from "react-router-dom";
import { useCamp, useAssignMeal, useRemoveMeal, useUpdateCamp, useUpsertCampDay, useMoveMeal } from "@/hooks/useCamps";
import { useMenus } from "@/hooks/useMenus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Users, Download, X, Plus, GripVertical, Info, Package, ClipboardCheck } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType, type CampMeal, type Menu, AGE_GROUPS, getWeightedParticipants, getAgeGroupCounts } from "@/lib/types";
import { CreateShoppingListDialog } from "@/components/CreateShoppingListDialog";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { MealUsageDialog } from "@/components/MealUsageDialog";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { NumberInput } from "@/components/NumberInput";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

const MEAL_TYPES: MealType[] = ["petit-dejeuner", "dejeuner", "gouter", "diner"];

export default function CampDetailPage() {
  const { campId } = useParams<{ campId: string }>();
  const navigate = useNavigate();
  const { data: camp, isLoading } = useCamp(campId!);
  const upsertCampDay = useUpsertCampDay();
  const moveMeal = useMoveMeal();
  const { data: shoppingLists } = useShoppingLists(campId!);
  const { toast } = useToast();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;
  }

  if (!camp) {
    return <div className="py-12 text-center text-muted-foreground">Camp introuvable</div>;
  }

  const days = eachDayOfInterval({
    start: parseISO(camp.start_date),
    end: parseISO(camp.end_date),
  });

  const getMealsForSlot = (date: string, mealType: MealType): CampMeal[] => {
    return camp.camp_meals?.filter(
      (m) => m.meal_date === date && m.meal_type === mealType
    ) || [];
  };

  const getCampDay = (date: string) => camp.camp_days?.find((d) => d.day_date === date);

  const getDayParticipants = (date: string): number => {
    const campDay = getCampDay(date);
    return getWeightedParticipants(campDay, camp.participant_count);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const [, destDate, destMealType] = destination.droppableId.split(":");
    const meal = camp.camp_meals?.find((m) => m.id === draggableId);
    if (!meal) return;
    if (meal.meal_date === destDate && meal.meal_type === destMealType) return;
    moveMeal.mutate(
      { mealId: draggableId, mealDate: destDate, mealType: destMealType },
      {
        onSuccess: () => toast({ title: "Menu déplacé !" }),
        onError: () => toast({ title: "Erreur lors du déplacement", variant: "destructive" }),
      }
    );
  };

  const handleExport = () => {
    let csv = "Date,Repas,Menu,Ingrédient,Quantité par personne,Quantité totale,Unité\n";
    days.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dateLabel = format(day, "dd/MM/yyyy");
      const participants = getDayParticipants(dateStr);
      MEAL_TYPES.forEach((type) => {
        const meals = getMealsForSlot(dateStr, type);
        meals.forEach((meal) => {
          if (meal?.menus) {
            const menu = meal.menus as Menu;
            if (menu.menu_ingredients && menu.menu_ingredients.length > 0) {
              menu.menu_ingredients.forEach((ing) => {
                csv += `${dateLabel},${MEAL_TYPE_LABELS[type]},${menu.name},${ing.name},${ing.quantity} ${ing.unit},${(ing.quantity * participants).toFixed(1)} ${ing.unit},${ing.unit}\n`;
              });
            } else {
              csv += `${dateLabel},${MEAL_TYPE_LABELS[type]},${menu.name},,,\n`;
            }
          }
        });
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${camp.name.replace(/\s+/g, "_")}_menus.csv`;
    link.click();
    toast({ title: "Export réussi !" });
  };

  const handleAgeGroupChange = (dateStr: string, groupKey: string, value: number) => {
    const campDay = getCampDay(dateStr);
    const current = getAgeGroupCounts(campDay);
    current[groupKey] = value;
    upsertCampDay.mutate({
      campId: camp.id,
      dayDate: dateStr,
      ...current,
    });

    // If editing the first day, propagate to all other days that have 0 for this group
    const firstDayStr = format(days[0], "yyyy-MM-dd");
    if (dateStr === firstDayStr && value > 0) {
      days.slice(1).forEach((otherDay) => {
        const otherDateStr = format(otherDay, "yyyy-MM-dd");
        const otherCampDay = getCampDay(otherDateStr);
        const otherCounts = getAgeGroupCounts(otherCampDay);
        if ((otherCounts[groupKey] ?? 0) === 0) {
          otherCounts[groupKey] = value;
          upsertCampDay.mutate({
            campId: camp.id,
            dayDate: otherDateStr,
            ...otherCounts,
          });
        }
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/camps")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{camp.name}</h1>
              <p className="text-muted-foreground">
                {format(parseISO(camp.start_date), "d MMMM", { locale: fr })} → {format(parseISO(camp.end_date), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <CreateShoppingListDialog camp={camp} />
            {shoppingLists && shoppingLists.length > 0 && (
              <div className="flex gap-1">
                {shoppingLists.map((sl) => (
                  <Button
                    key={sl.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/camps/${camp.id}/liste/${sl.id}`)}
                    className="text-xs"
                  >
                    📋 {sl.name}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-4">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const campDay = getCampDay(dateStr);
              const ageCounts = getAgeGroupCounts(campDay);
              const weightedParticipants = getDayParticipants(dateStr);
              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base font-semibold capitalize">
                          {format(day, "EEEE d MMMM", { locale: fr })}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {AGE_GROUPS.map((g) => (
                            <div key={g.key} className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1">
                              <span className={`text-xs font-semibold ${g.color}`} title={`${g.label} (${g.ageRange})`}>
                                {g.label.charAt(0)}
                              </span>
                              <NumberInput
                                value={ageCounts[g.key]}
                                onChange={(val) => handleAgeGroupChange(dateStr, g.key, val)}
                              />
                            </div>
                          ))}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 rounded-lg border bg-primary/10 px-2 py-1 cursor-help">
                                <Users className="h-3 w-3 text-primary" />
                                <span className="text-xs font-bold text-primary">{weightedParticipants.toFixed(1)}</span>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
                              <p className="font-semibold">Équivalent portions</p>
                              <p>Les quantités d'ingrédients sont multipliées par un facteur selon la tranche d'âge :</p>
                              {AGE_GROUPS.map((g) => (
                                <p key={g.key}>
                                  <span className={`font-semibold ${g.color}`}>{g.label}</span> ({g.ageRange}) : ×{g.multiplier}
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {MEAL_TYPES.map((type) => (
                          <MealSlot
                            key={type}
                            campId={camp.id}
                            date={dateStr}
                            mealType={type}
                            meals={getMealsForSlot(dateStr, type)}
                            participantCount={weightedParticipants}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </TooltipProvider>
  );
}

function MealSlot({
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
  const removeMeal = useRemoveMeal();
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
                      <button onClick={() => removeMeal.mutate(meal.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X className="h-3 w-3" />
                      </button>
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
                  </div>
                )}
              </Draggable>
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
                    {m.is_default && <Badge className="mt-1 text-xs gradient-campfire border-0 text-primary-foreground">Standard</Badge>}
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
