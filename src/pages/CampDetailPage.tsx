import { useParams, useNavigate } from "react-router-dom";
import { useCamp, useAssignMeal, useRemoveMeal, useUpdateCamp } from "@/hooks/useCamps";
import { useMenus } from "@/hooks/useMenus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Users, Download, X, Plus } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType, type CampMeal, type Menu } from "@/lib/types";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const MEAL_TYPES: MealType[] = ["petit-dejeuner", "dejeuner", "gouter", "diner"];

export default function CampDetailPage() {
  const { campId } = useParams<{ campId: string }>();
  const navigate = useNavigate();
  const { data: camp, isLoading } = useCamp(campId!);
  const updateCamp = useUpdateCamp();
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

  const getMealForSlot = (date: string, mealType: MealType): CampMeal | undefined => {
    return camp.camp_meals?.find(
      (m) => m.meal_date === date && m.meal_type === mealType
    );
  };

  const handleExport = () => {
    let csv = "Date,Repas,Menu,Ingrédient,Quantité par personne,Quantité totale,Unité\n";
    days.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dateLabel = format(day, "dd/MM/yyyy");
      MEAL_TYPES.forEach((type) => {
        const meal = getMealForSlot(dateStr, type);
        if (meal?.menus) {
          const menu = meal.menus as Menu;
          if (menu.menu_ingredients && menu.menu_ingredients.length > 0) {
            menu.menu_ingredients.forEach((ing) => {
              csv += `${dateLabel},${MEAL_TYPE_LABELS[type]},${menu.name},${ing.name},${ing.quantity} ${ing.unit},${(ing.quantity * camp.participant_count).toFixed(1)} ${ing.unit},${ing.unit}\n`;
            });
          } else {
            csv += `${dateLabel},${MEAL_TYPE_LABELS[type]},${menu.name},,,\n`;
          }
        }
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${camp.name.replace(/\s+/g, "_")}_menus.csv`;
    link.click();
    toast({ title: "Export réussi !" });
  };

  return (
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={camp.participant_count}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0) updateCamp.mutate({ id: camp.id, participant_count: val });
              }}
              className="h-7 w-16 border-0 bg-transparent p-0 text-center font-semibold"
              min="1"
            />
            <span className="text-sm text-muted-foreground">pers.</span>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <motion.div
              key={dateStr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold capitalize">
                    {format(day, "EEEE d MMMM", { locale: fr })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {MEAL_TYPES.map((type) => (
                      <MealSlot
                        key={type}
                        campId={camp.id}
                        date={dateStr}
                        mealType={type}
                        meal={getMealForSlot(dateStr, type)}
                        participantCount={camp.participant_count}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MealSlot({
  campId,
  date,
  mealType,
  meal,
  participantCount,
}: {
  campId: string;
  date: string;
  mealType: MealType;
  meal?: CampMeal;
  participantCount: number;
}) {
  const assignMeal = useAssignMeal();
  const removeMeal = useRemoveMeal();
  const { data: menus } = useMenus(mealType);
  const [dialogOpen, setDialogOpen] = useState(false);

  const menu = meal?.menus as Menu | undefined;

  return (
    <div className="rounded-lg border bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {MEAL_TYPE_ICONS[mealType]} {MEAL_TYPE_LABELS[mealType]}
        </span>
        {menu && (
          <button
            onClick={() => removeMeal.mutate({ campId, mealDate: date, mealType })}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {menu ? (
        <div className="space-y-1">
          <p className="text-sm font-medium leading-tight">{menu.name}</p>
          {menu.menu_ingredients && menu.menu_ingredients.length > 0 && (
            <div className="space-y-0.5">
              {menu.menu_ingredients.map((ing) => (
                <p key={ing.id} className="text-xs text-muted-foreground">
                  {ing.name}: <span className="font-medium">{(ing.quantity * participantCount).toFixed(0)}{ing.unit}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex w-full items-center justify-center rounded border border-dashed border-border py-3 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
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
      )}
    </div>
  );
}
