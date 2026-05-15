import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  Tent,
  BookOpen,
  UtensilsCrossed,
  ShoppingCart,
  Leaf,
  Bookmark,
  TrendingUp,
  ShieldCheck,
  Cloud,
} from "lucide-react";
import { MEAL_TYPE_LABELS, type MealType } from "@/lib/types";

type PlatformStats = {
  total_users: number;
  total_camps: number;
  total_menus: number;
  default_menus: number;
  shared_menus: number;
  private_menus: number;
  total_meals_planned: number;
  total_shopping_lists: number;
  total_menu_ingredients: number;
  total_agribalyse_foods: number;
  total_bookmarks: number;
  total_participants_planned: number;
  total_portions_missing: number;
  total_portions_wasted: number;
  avg_camp_duration_days: number;
  avg_camp_participants: number;
  camps_by_month: { month: string; count: number }[];
  meals_by_type: { type: string; count: number }[];
  menus_by_type: { type: string; count: number }[];
  top_ingredients: { name: string; count: number }[];
  menus_with_co2_data: number;
  avg_co2_per_portion: number;
  avg_co2_per_portion_by_type: { type: string; avg_co2: number; count: number }[];
  generated_at: string;
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f97316",
  "#8b5cf6",
];

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function formatMealType(t: string): string {
  return MEAL_TYPE_LABELS[t as MealType] ?? t;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform_stats"],
    queryFn: async (): Promise<PlatformStats> => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      return data as unknown as PlatformStats;
    },
    staleTime: 5 * 60 * 1000,
  });

  const nfFr = new Intl.NumberFormat("fr-FR");
  const nfCo2 = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Statistiques d'usage
        </h1>
        <p className="text-muted-foreground mt-1">
          Aperçu de l'activité sur la plateforme.
        </p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Données 100 % anonymes — aucune information personnelle, aucun contenu de menu ou de camp identifiable n'est exposé.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-center text-destructive text-sm">
            Erreur lors du chargement des statistiques.
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Intendant·e·s inscrit·e·s"
              value={nfFr.format(data.total_users)}
            />
            <StatCard
              icon={Tent}
              label="Camps planifiés"
              value={nfFr.format(data.total_camps)}
              hint={
                data.total_camps > 0
                  ? `Moy. ${data.avg_camp_participants} participant·e·s · ${data.avg_camp_duration_days} j`
                  : undefined
              }
            />
            <StatCard
              icon={BookOpen}
              label="Menus créés"
              value={nfFr.format(data.total_menus)}
              hint={`${data.default_menus} bibliothèque · ${data.shared_menus} partagés · ${data.private_menus} privés`}
            />
            <StatCard
              icon={UtensilsCrossed}
              label="Repas planifiés"
              value={nfFr.format(data.total_meals_planned)}
            />
            <StatCard
              icon={ShoppingCart}
              label="Listes de courses"
              value={nfFr.format(data.total_shopping_lists)}
            />
            <StatCard
              icon={Bookmark}
              label="Menus favoris"
              value={nfFr.format(data.total_bookmarks)}
            />
            <StatCard
              icon={Users}
              label="Participant·e·s prévu·e·s"
              value={nfFr.format(data.total_participants_planned)}
              hint="Cumul sur tous les camps"
            />
            <StatCard
              icon={Leaf}
              label="Aliments Agribalyse"
              value={nfFr.format(data.total_agribalyse_foods)}
            />
            <StatCard
              icon={Cloud}
              label="CO₂ moyen par portion"
              value={
                data.menus_with_co2_data > 0
                  ? `${nfCo2.format(data.avg_co2_per_portion)} kg`
                  : "—"
              }
              hint={
                data.menus_with_co2_data > 0
                  ? `${nfFr.format(data.menus_with_co2_data)} menu(s) avec données`
                  : "Aucune donnée Agribalyse associée"
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Camps créés par mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.camps_by_month.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucun camp pour le moment.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.camps_by_month.map((d) => ({
                        ...d,
                        label: formatMonth(d.month),
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => [nfFr.format(value), "Camps"]}
                        labelFormatter={(label) => `Mois : ${label}`}
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  Répartition des repas planifiés
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.meals_by_type.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucun repas planifié pour le moment.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.meals_by_type.map((d) => ({
                          ...d,
                          label: formatMealType(d.type),
                        }))}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.meals_by_type.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => nfFr.format(value)}
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Répartition des menus
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.menus_by_type.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucun menu pour le moment.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.menus_by_type.map((d) => ({
                        ...d,
                        label: formatMealType(d.type),
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => [nfFr.format(value), "Menus"]}
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  Émissions CO₂ moyennes par type de repas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.avg_co2_per_portion_by_type.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucun menu associé à la base Agribalyse.
                  </p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={data.avg_co2_per_portion_by_type.map((d) => ({
                          ...d,
                          label: formatMealType(d.type),
                        }))}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => nfCo2.format(v)}
                        />
                        <Tooltip
                          formatter={(value: number, _name, payload) => [
                            `${nfCo2.format(value)} kg CO₂eq`,
                            `Moyenne / portion (${nfFr.format(payload?.payload?.count ?? 0)} menu(s))`,
                          ]}
                          contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                        />
                        <Bar dataKey="avg_co2" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-2">
                      Estimation par portion (kg CO₂eq), basée sur les ingrédients reliés à Agribalyse.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  Ingrédients les plus utilisés
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_ingredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucun ingrédient pour le moment.
                  </p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(260, data.top_ingredients.length * 22 + 20)}
                  >
                    <BarChart
                      data={data.top_ingredients}
                      layout="vertical"
                      margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [nfFr.format(value), "Occurrences"]}
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Mises à jour à chaque chargement de la page. Dernière génération :{" "}
            {new Date(data.generated_at).toLocaleString("fr-FR")}
          </p>
        </>
      )}
    </div>
  );
}
