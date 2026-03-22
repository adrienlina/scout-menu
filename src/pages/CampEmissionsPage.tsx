import { useParams, useNavigate } from "react-router-dom";
import { useCamp } from "@/hooks/useCamps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Leaf, ArrowUpDown } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType, type CampMeal, type Menu, getWeightedParticipants, getMenuCO2 } from "@/lib/types";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const MEAL_TYPES: MealType[] = ["petit-dejeuner", "dejeuner", "gouter", "diner"];

export default function CampEmissionsPage() {
  const { campId } = useParams<{ campId: string }>();
  const navigate = useNavigate();
  const { data: camp, isLoading } = useCamp(campId!);
  const [mealSort, setMealSort] = useState<"chrono" | "emissions">("chrono");

  const days = useMemo(() => {
    if (!camp) return [];
    return eachDayOfInterval({ start: parseISO(camp.start_date), end: parseISO(camp.end_date) });
  }, [camp]);

  const getDayParticipants = (dateStr: string): number => {
    const campDay = camp?.camp_days?.find((d) => d.day_date === dateStr);
    return getWeightedParticipants(campDay, camp?.participant_count ?? 0);
  };

  // All meals with CO2 data
  const mealEmissions = useMemo(() => {
    if (!camp?.camp_meals) return [];
    return camp.camp_meals.map((meal) => {
      const menu = meal.menus as Menu | undefined;
      const participants = getDayParticipants(meal.meal_date);
      const co2 = getMenuCO2(menu, participants);
      return { meal, menu, co2, date: meal.meal_date, mealType: meal.meal_type as MealType };
    }).filter((m) => m.menu);
  }, [camp, days]);

  // Sorted meals
  const sortedMeals = useMemo(() => {
    const sorted = [...mealEmissions];
    if (mealSort === "emissions") {
      sorted.sort((a, b) => b.co2 - a.co2);
    } else {
      sorted.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType);
      });
    }
    return sorted;
  }, [mealEmissions, mealSort]);

  // By ingredient aggregation
  const ingredientEmissions = useMemo(() => {
    if (!camp?.camp_meals) return [];
    const map = new Map<string, { name: string; co2: number; totalKg: number }>();
    camp.camp_meals.forEach((meal) => {
      const menu = meal.menus as Menu | undefined;
      if (!menu?.menu_ingredients) return;
      const participants = getDayParticipants(meal.meal_date);
      menu.menu_ingredients.forEach((ing) => {
        const cc = ing.agribalyse_foods?.changement_climatique;
        if (!cc) return;
        const kgProduct = ing.quantity * ing.unit_multiplier * participants;
        const co2 = kgProduct * cc;
        const existing = map.get(ing.name) || { name: ing.name, co2: 0, totalKg: 0 };
        existing.co2 += co2;
        existing.totalKg += kgProduct;
        map.set(ing.name, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.co2 - a.co2);
  }, [camp, days]);

  const totalCO2 = useMemo(() => mealEmissions.reduce((s, m) => s + m.co2, 0), [mealEmissions]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;
  if (!camp) return <div className="py-12 text-center text-muted-foreground">Camp introuvable</div>;

  const maxMealCO2 = Math.max(...sortedMeals.map((m) => m.co2), 0.01);
  const maxIngCO2 = Math.max(...ingredientEmissions.map((i) => i.co2), 0.01);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/camps/${campId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-500" />
            Émissions CO₂ — {camp.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Total estimé : <span className="font-semibold text-foreground">{totalCO2.toFixed(2)} kg CO₂</span>
          </p>
        </div>
      </div>

      {/* By meal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Par repas</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setMealSort(mealSort === "chrono" ? "emissions" : "chrono")}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {mealSort === "chrono" ? "Chronologique" : "Émissions ↓"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {sortedMeals.map((item) => {
              const barWidth = maxMealCO2 > 0 ? (item.co2 / maxMealCO2) * 100 : 0;
              return (
                <div key={item.meal.id} className="flex items-center gap-3 text-sm">
                  <div className="w-40 shrink-0 truncate">
                    <span className="text-muted-foreground text-xs">
                      {format(parseISO(item.date), "dd/MM")} {MEAL_TYPE_ICONS[item.mealType]}
                    </span>{" "}
                    <span className="font-medium">{item.menu?.name}</span>
                  </div>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/70 rounded transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-muted-foreground shrink-0">
                    {item.co2.toFixed(2)} kg
                  </span>
                </div>
              );
            })}
            {sortedMeals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée CO₂ disponible</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By ingredient */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Par aliment (cumulé sur le camp)</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredientEmissions.length > 0 ? (
            <div className="space-y-1.5">
              {ingredientEmissions.map((item) => {
                const barWidth = maxIngCO2 > 0 ? (item.co2 / maxIngCO2) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3 text-sm">
                    <div className="w-40 shrink-0 truncate font-medium">{item.name}</div>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/70 rounded transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-28 text-right text-xs text-muted-foreground shrink-0">
                      {item.co2.toFixed(2)} kg CO₂
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée CO₂ disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
