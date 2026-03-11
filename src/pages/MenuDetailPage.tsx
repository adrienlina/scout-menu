import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Plus, X, Trash2, Leaf, Save, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

type IngredientRow = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  agribalyse_food_id: string | null;
  agribalyse_name?: string | null;
  changement_climatique?: number | null;
};

export default function MenuDetailPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    enabled: !!menuId,
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

      // Fetch agribalyse data for linked ingredients
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
    enabled: !!menuId,
  });

  const isOwner = menu?.user_id === user?.id;

  // CO2 calculation
  const co2Data = useMemo(() => {
    return ingredients
      .filter(i => i.changement_climatique !== null && i.changement_climatique !== undefined)
      .map(i => {
        // Convert quantity to kg for calculation
        let qtyKg = i.quantity;
        if (i.unit === "g") qtyKg = i.quantity / 1000;
        else if (i.unit === "ml") qtyKg = i.quantity / 1000;
        else if (i.unit === "L") qtyKg = i.quantity;
        else if (i.unit === "pièce") qtyKg = i.quantity * 0.15; // rough estimate
        // kg stays as is

        return {
          name: i.name,
          co2: (i.changement_climatique! * qtyKg),
          unit: "kg CO₂ eq",
        };
      });
  }, [ingredients]);

  const totalCO2 = useMemo(() => co2Data.reduce((sum, d) => sum + d.co2, 0), [co2Data]);

  if (menuLoading || ingredientsLoading) {
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{menu.name}</h1>
          {menu.description && <p className="text-sm text-muted-foreground">{menu.description}</p>}
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
                      <TableCell colSpan={isOwner ? 6 : 5} className="text-center text-muted-foreground py-8">
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
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => [
                          value.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) + " kg CO₂ eq",
                          "Impact",
                        ]}
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

// -- Ingredient Row with Agribalyse picker --
function IngredientTableRow({
  ingredient,
  isOwner,
  menuId,
}: {
  ingredient: IngredientRow;
  isOwner: boolean;
  menuId: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteIng = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_ingredients").delete().eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    },
  });

  const linkAgribalyse = useMutation({
    mutationFn: async (agriId: string | null) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ agribalyse_food_id: agriId } as any)
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      toast({ title: "Aliment Agribalyse associé" });
    },
  });

  // CO2 for this ingredient
  let co2 = null;
  if (ingredient.changement_climatique !== null && ingredient.changement_climatique !== undefined) {
    let qtyKg = ingredient.quantity;
    if (ingredient.unit === "g") qtyKg = ingredient.quantity / 1000;
    else if (ingredient.unit === "ml") qtyKg = ingredient.quantity / 1000;
    else if (ingredient.unit === "L") qtyKg = ingredient.quantity;
    else if (ingredient.unit === "pièce") qtyKg = ingredient.quantity * 0.15;
    co2 = ingredient.changement_climatique * qtyKg;
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{ingredient.name}</TableCell>
      <TableCell>{ingredient.quantity}</TableCell>
      <TableCell>{ingredient.unit}</TableCell>
      <TableCell>
        {isOwner ? (
          <AgribalyseSearch
            currentId={ingredient.agribalyse_food_id}
            currentName={ingredient.agribalyse_name}
            onSelect={(id) => linkAgribalyse.mutate(id)}
            searchHint={ingredient.name}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {ingredient.agribalyse_name || "—"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {co2 !== null ? co2.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "—"}
      </TableCell>
      {isOwner && (
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => deleteIng.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

// -- Agribalyse food search picker --
function AgribalyseSearch({
  currentId,
  currentName,
  onSelect,
  searchHint,
}: {
  currentId: string | null;
  currentName?: string | null;
  onSelect: (id: string | null) => void;
  searchHint: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: results = [] } = useQuery({
    queryKey: ["agribalyse-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("agribalyse_foods")
        .select("id, name, changement_climatique")
        .ilike("name", `%${search}%`)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 2,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs justify-start font-normal max-w-[220px] truncate"
        >
          {currentName ? (
            <span className="truncate">{currentName}</span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Associer…
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher un aliment…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.length < 2 ? "Tapez au moins 2 caractères…" : "Aucun résultat"}
            </CommandEmpty>
            {currentId && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-3 w-3 text-destructive" />
                  <span className="text-destructive text-xs">Retirer l'association</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Résultats">
              {results.map((food) => (
                <CommandItem
                  key={food.id}
                  value={food.id}
                  onSelect={() => {
                    onSelect(food.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-xs">{food.name}</span>
                    {food.changement_climatique !== null && (
                      <span className="text-[10px] text-muted-foreground">
                        {food.changement_climatique.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg CO₂ eq/kg
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// -- Add ingredient form --
function AddIngredientForm({ menuId }: { menuId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  const [agriId, setAgriId] = useState<string | null>(null);
  const [agriName, setAgriName] = useState<string | null>(null);

  const addIng = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        menu_id: menuId,
        name,
        quantity: parseFloat(qty),
        unit,
      };
      if (agriId) insertData.agribalyse_food_id = agriId;

      const { error } = await supabase.from("menu_ingredients").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      setName("");
      setQty("");
      setAgriId(null);
      setAgriName(null);
      toast({ title: "Ingrédient ajouté" });
    },
  });

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajouter un ingrédient</p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[120px]">
          <Label className="text-xs">Nom</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pâtes" className="h-8 text-sm" />
        </div>
        <div className="w-20">
          <Label className="text-xs">Quantité</Label>
          <Input value={qty} onChange={e => setQty(e.target.value)} placeholder="100" type="number" step="0.1" className="h-8 text-sm" />
        </div>
        <div className="w-20">
          <Label className="text-xs">Unité</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["g", "kg", "ml", "L", "pièce"].map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs">Aliment Agribalyse</Label>
          <AgribalyseSearch
            currentId={agriId}
            currentName={agriName}
            onSelect={(id) => {
              setAgriId(id);
              // We'll fetch the name on selection
              if (!id) setAgriName(null);
            }}
            searchHint={name}
          />
        </div>
        <Button
          size="sm"
          className="h-8"
          disabled={!name || !qty || addIng.isPending}
          onClick={() => addIng.mutate()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
