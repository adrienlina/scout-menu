import { useState, useMemo, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, X, Trash2, Leaf, Search, Share2, Check, Pencil, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType } from "@/lib/types";
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
  unit_multiplier: number;
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
                    <TableHead className="w-24">Multiplicateur</TableHead>
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

// -- Editable Menu Header --
function MenuHeader({ menu, isOwner }: { menu: any; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [name, setName] = useState(menu.name);
  const [description, setDescription] = useState(menu.description || "");

  useEffect(() => {
    setName(menu.name);
    setDescription(menu.description || "");
  }, [menu.name, menu.description]);

  const updateField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase
        .from("menus")
        .update(fields)
        .eq("id", menu.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-detail", menu.id] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    },
  });

  const saveName = () => {
    if (name.trim() && name !== menu.name) {
      updateField.mutate({ name: name.trim() });
    }
    setEditingName(false);
  };

  const saveDescription = () => {
    if (description !== (menu.description || "")) {
      updateField.mutate({ description: description.trim() || null });
    }
    setEditingDesc(false);
  };

  const toggleShared = () => {
    updateField.mutate(
      { is_shared: !menu.is_shared },
      { onSuccess: () => toast({ title: menu.is_shared ? "Menu rendu privé" : "Menu partagé !" }) }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Title */}
        {isOwner && editingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold h-10"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setName(menu.name); setEditingName(false); } }}
              onBlur={saveName}
            />
          </div>
        ) : (
          <h1
            className={`text-2xl font-bold tracking-tight ${isOwner ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
            onClick={() => isOwner && setEditingName(true)}
            title={isOwner ? "Cliquer pour modifier" : undefined}
          >
            {menu.name}
            {isOwner && <Pencil className="inline ml-2 h-4 w-4 text-muted-foreground" />}
          </h1>
        )}

        {/* Meal type */}
        {isOwner ? (
          <Select
            value={menu.meal_type}
            onValueChange={(v) => updateField.mutate({ meal_type: v })}
          >
            <SelectTrigger className="w-auto h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="petit-dejeuner">☀️ Petit-déjeuner</SelectItem>
              <SelectItem value="dejeuner">🍽️ Déjeuner/Dîner</SelectItem>
              <SelectItem value="gouter">🍪 Goûter</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {MEAL_TYPE_ICONS[menu.meal_type as MealType]} {MEAL_TYPE_LABELS[menu.meal_type as MealType]}
          </Badge>
        )}

        {/* Share toggle */}
        {isOwner && !menu.is_default && (
          <div className="flex items-center gap-2 ml-auto">
            <Share2 className={`h-4 w-4 ${menu.is_shared ? "text-primary" : "text-muted-foreground"}`} />
            <Label htmlFor="share-toggle" className="text-sm text-muted-foreground cursor-pointer">
              {menu.is_shared ? "Partagé" : "Privé"}
            </Label>
            <Switch
              id="share-toggle"
              checked={menu.is_shared}
              onCheckedChange={toggleShared}
            />
          </div>
        )}
      </div>

      {/* Description */}
      {isOwner && editingDesc ? (
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ajouter une description…"
          className="text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") saveDescription(); if (e.key === "Escape") { setDescription(menu.description || ""); setEditingDesc(false); } }}
          onBlur={saveDescription}
        />
      ) : (
        <p
          className={`text-sm text-muted-foreground ${isOwner ? "cursor-pointer hover:text-foreground transition-colors" : ""}`}
          onClick={() => isOwner && setEditingDesc(true)}
          title={isOwner ? "Cliquer pour modifier" : undefined}
        >
          {menu.description || (isOwner ? "Ajouter une description…" : "")}
          {isOwner && <Pencil className="inline ml-1 h-3 w-3" />}
        </p>
      )}
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

  const updateMultiplier = useMutation({
    mutationFn: async (multiplier: number) => {
      const { error } = await supabase
        .from("menu_ingredients")
        .update({ unit_multiplier: multiplier } as any)
        .eq("id", ingredient.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-ingredients-detail", menuId] });
    },
  });

  let co2 = null;
  if (ingredient.changement_climatique !== null && ingredient.changement_climatique !== undefined) {
    const qtyKg = ingredient.quantity * ingredient.unit_multiplier;
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
      <TableCell>
        {isOwner ? (
          <Input
            type="number"
            step="0.001"
            value={ingredient.unit_multiplier}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) updateMultiplier.mutate(val);
            }}
            className="h-7 w-20 text-xs"
          />
        ) : (
          <span className="text-xs tabular-nums">{ingredient.unit_multiplier}</span>
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
