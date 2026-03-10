import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface ImpactColumn {
  key: string;
  label: string;
  unit: string;
  tooltip: string;
}

interface AgribalyseComparisonChartProps {
  selectedFoods: any[];
  selectedImpactCols: ImpactColumn[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

function truncateName(name: string, maxLen = 25): string {
  return name.length > maxLen ? name.slice(0, maxLen) + "…" : name;
}

export default function AgribalyseComparisonChart({
  selectedFoods,
  selectedImpactCols,
}: AgribalyseComparisonChartProps) {
  // One chart per indicator: bars = foods
  const charts = useMemo(() => {
    return selectedImpactCols.map((col) => {
      const data = selectedFoods.map((food) => ({
        name: truncateName(food.name),
        fullName: food.name,
        value: food[col.key] ?? null,
      }));
      return { col, data };
    });
  }, [selectedFoods, selectedImpactCols]);

  if (selectedFoods.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Comparaison graphique
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map(({ col, data }) => {
            const hasData = data.some((d) => d.value !== null);
            if (!hasData) return null;

            return (
              <div key={col.key} className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  {col.label}{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    ({col.unit})
                  </span>
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(180, selectedFoods.length * 40 + 40)}>
                  <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        Math.abs(v) < 0.01 && v !== 0
                          ? v.toExponential(1)
                          : v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        (Math.abs(value) < 0.01 && value !== 0
                          ? value.toExponential(2)
                          : value.toLocaleString("fr-FR", { maximumFractionDigits: 3 })) +
                          " " +
                          col.unit,
                        col.label,
                      ]}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName ?? label
                      }
                      contentStyle={{
                        fontSize: "12px",
                        borderRadius: "8px",
                        textAlign: "left",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
