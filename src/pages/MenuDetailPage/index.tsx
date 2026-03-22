import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Leaf, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { MenuHeader } from "./MenuHeader";
import { IngredientTableRow } from "./IngredientTableRow";
import { AddIngredientForm } from "./AddIngredientForm";
import type { IngredientRow } from "./types";

export default function MenuDetailPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = menuId === "new";

  // Create new menu and redirect
  const createMenu = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("menus")
        .insert({ name: "Nouveau menu", meal_type: "dejeuner", user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      navigate(`/menus/${data.id}`, { replace: true });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      navigate("/menus");
    },
  });

  useEffect(() => {
    if (isNew) {
      createMenu.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Fetch menu
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["menu-detail", menuId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("id", menuId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!menuId && !isNew,
  });

  // Fetch ingredients with agribalyse data
  const { data: ingredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ["menu-ingredients-detail", menuId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_ingredients")
        .select("*")
        .eq("menu_id", menuId!)
        .order("name");
      if (error) throw error;

      const agriIds = (data || []).map((i: any) => i.agribalyse_food_id).filter(Boolean) as string[];
      let agriMap: Record<string, { name: string; changement_climatique: number | null }> = {};
      if (agriIds.length > 0) {
        const { data: agriData } = await supabase
          .from("agribalyse_foods")
          .select("id, name, changement_climatique")
          .in("id", agriIds);
        if (agriData) {
          agriMap = Object.fromEntries(agriData.map(a => [a.id, { name: a.name, changement_climatique: a.changement_climatique }]));
        }
      }

      return (data || []).map((i: any) => ({
        ...i,
        agribalyse_name: i.agribalyse_food_id ? agriMap[i.agribalyse_food_id]?.name || null : null,
        changement_climatique: i.agribalyse_food_id ? agriMap[i.agribalyse_food_id]?.changement_climatique || null : null,
      })) as IngredientRow[];
    },
    enabled: !!menuId && !isNew,
  });

  const isOwner = menu?.user_id === user?.id;

  // CO2 calculation
  const co2Data = useMemo(() => {
    return ingredients
      .filter(i => i.changement_climatique !== null && i.changement_climatique !== undefined)
      .map(i => {
        const qtyKg = i.quantity * i.unit_multiplier;
        return { name: i.name, co2: (i.changement_climatique! * qtyKg), unit: "kg CO₂ eq" };
      });
  }, [ingredients]);

  const totalCO2 = useMemo(() => co2Data.reduce((sum, d) => sum + d.co2, 0), [co2Data]);

  if (isNew || menuLoading || ingredientsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/menus")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <p className="text-muted-foreground">Menu introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menus")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <MenuHeader menu={menu} isOwner={isOwner} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Ingredients */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ingrédients (par personne)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrédient</TableHead>
                    <TableHead className="w-20">Quantité</TableHead>
                    <TableHead className="w-16">Unité</TableHead>
                    <TableHead>Aliment Agribalyse</TableHead>
                    <TableHead className="w-44">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              Multiplicateur ingrédient → kg de produit
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p>Facteur de conversion entre l'unité de l'ingrédient et le kg utilisé par Agribalyse.</p>
                            <p className="mt-1">Exemples : pour des grammes → 0.001, pour des kg → 1, pour des litres → 1 (approximation eau).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="w-28 text-right">CO₂ (kg eq)</TableHead>
                    {isOwner && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ing) => (
                    <IngredientTableRow
                      key={ing.id}
                      ingredient={ing}
                      isOwner={isOwner}
                      menuId={menuId!}
                    />
                  ))}
                  {ingredients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 7 : 6} className="text-center text-muted-foreground py-8">
                        Aucun ingrédient
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {isOwner && (
                <AddIngredientForm menuId={menuId!} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: CO2 Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                Impact CO₂ par portion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">
                  {totalCO2 > 0 ? totalCO2.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "—"}
                </p>
                <p className="text-sm text-muted-foreground">kg CO₂ eq / personne</p>
              </div>

              {co2Data.length > 0 && (
                <div>
                  <ResponsiveContainer width="100%" height={Math.max(150, co2Data.length * 36 + 20)}>
                    <BarChart data={co2Data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(value: number) => [value.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) + " kg CO₂ eq", "Impact"]}
                        contentStyle={{ fontSize: "12px", borderRadius: "8px", textAlign: "left" }}
                      />
                      <Bar dataKey="co2" radius={[0, 4, 4, 0]} barSize={20}>
                        {co2Data.map((_, idx) => (
                          <Cell key={idx} fill={`hsl(${120 + idx * 30}, 60%, 45%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {co2Data.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Associez des aliments Agribalyse aux ingrédients pour voir l'impact CO₂.
                </p>
              )}

              {co2Data.length > 0 && (
                <div className="space-y-1">
                  {co2Data.sort((a, b) => b.co2 - a.co2).map(d => (
                    <div key={d.name} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{d.name}</span>
                      <span className="font-medium tabular-nums">{d.co2.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
