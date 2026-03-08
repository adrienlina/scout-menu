import { useState, useMemo, useEffect } from "react";
import { useAgribalyseFoods, useImportAgribalyse } from "@/hooks/useAgribalyse";
import { IMPACT_COLUMNS, DEFAULT_VISIBLE_IMPACTS } from "@/lib/agribalyse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Leaf, Factory, Info, BarChart3, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function formatScientific(val: number | null): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 0.01 && Math.abs(val) < 10000) return val.toFixed(4);
  return val.toExponential(2);
}

export default function AgribalysePage() {
  const { data: foods = [], isLoading } = useAgribalyseFoods();
  const importMutation = useImportAgribalyse();
  const [search, setSearch] = useState("");
  const [bioFilter, setBioFilter] = useState<"all" | "bio" | "conv">("all");
  const [visibleImpacts, setVisibleImpacts] = useState<string[]>(DEFAULT_VISIBLE_IMPACTS as unknown as string[]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [productionTypeFilter, setProductionTypeFilter] = useState<string>("all");

  // Auto-import if no data
  useEffect(() => {
    if (!isLoading && foods.length === 0 && !importMutation.isPending) {
      importMutation.mutate(undefined, {
        onSuccess: (result) => {
          if (result.imported > 0) {
            toast({ title: "Import réussi", description: result.message });
          }
        },
        onError: (err) => {
          toast({ title: "Erreur d'import", description: String(err), variant: "destructive" });
        },
      });
    }
  }, [isLoading, foods.length]);

  const productionTypes = useMemo(() => {
    const types = new Set(foods.map(f => f.production_type).filter(Boolean));
    return Array.from(types).sort();
  }, [foods]);

  const filteredFoods = useMemo(() => {
    let result = foods;
    if (bioFilter === "bio") result = result.filter(f => f.is_bio);
    if (bioFilter === "conv") result = result.filter(f => !f.is_bio);
    if (productionTypeFilter !== "all") result = result.filter(f => f.production_type === productionTypeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [foods, bioFilter, productionTypeFilter, search]);

  const comparedFoods = useMemo(() => {
    return foods.filter(f => selectedFoods.includes(f.id));
  }, [foods, selectedFoods]);

  const toggleFood = (id: string) => {
    setSelectedFoods(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleImpact = (key: string) => {
    setVisibleImpacts(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  const visibleImpactColumns = IMPACT_COLUMNS.filter(c => visibleImpacts.includes(c.key));

  if (isLoading || importMutation.isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">
            {importMutation.isPending ? "Import des données AGRIBALYSE en cours..." : "Chargement..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AGRIBALYSE</h1>
          <p className="text-muted-foreground">
            Impacts environnementaux des produits agricoles · {foods.length} aliments
          </p>
        </div>
      </div>

      <Tabs defaultValue="explore" className="space-y-4">
        <TabsList>
          <TabsTrigger value="explore" className="gap-2">
            <Search className="h-4 w-4" />
            Explorer
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparer ({selectedFoods.length})
          </TabsTrigger>
        </TabsList>

        {/* Impact columns selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indicateurs affichés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {IMPACT_COLUMNS.map(col => (
                <Tooltip key={col.key}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={visibleImpacts.includes(col.key) ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors"
                      onClick={() => toggleImpact(col.key)}
                    >
                      {col.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold mb-1">{col.label}</p>
                    <p className="text-xs">{col.tooltip}</p>
                    <p className="text-xs text-muted-foreground mt-1">Unité : {col.unit}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        <TabsContent value="explore" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un aliment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={bioFilter} onValueChange={(v: any) => setBioFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bio + Conventionnel</SelectItem>
                <SelectItem value="bio">🌿 Biologique</SelectItem>
                <SelectItem value="conv">🏭 Conventionnel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productionTypeFilter} onValueChange={setProductionTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type de production" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {productionTypes.map(t => (
                  <SelectItem key={t} value={t!}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="min-w-[250px]">Aliment</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      {visibleImpactColumns.map(col => (
                        <TableHead key={col.key} className="min-w-[120px] text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-end gap-1 cursor-help">
                                {col.label.length > 20 ? col.label.slice(0, 18) + "…" : col.label}
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p className="font-semibold mb-1">{col.label}</p>
                              <p className="text-xs">{col.tooltip}</p>
                              <p className="text-xs text-muted-foreground mt-1">Unité : {col.unit}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFoods.slice(0, 200).map(food => (
                      <TableRow
                        key={food.id}
                        className={selectedFoods.includes(food.id) ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFoods.includes(food.id)}
                            onCheckedChange={() => toggleFood(food.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {food.is_bio ? (
                              <Leaf className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <Factory className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-medium">{food.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {food.production_type || "—"}
                          </Badge>
                        </TableCell>
                        {visibleImpactColumns.map(col => (
                          <TableCell key={col.key} className="text-right font-mono text-xs">
                            {formatScientific((food as any)[col.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredFoods.length > 200 && (
                <p className="text-center text-sm text-muted-foreground py-3">
                  {filteredFoods.length - 200} aliments supplémentaires non affichés. Affinez votre recherche.
                </p>
              )}
              {filteredFoods.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Aucun aliment trouvé.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          {comparedFoods.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sélectionnez des aliments dans l'onglet "Explorer" pour les comparer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {comparedFoods.map(food => (
                  <Badge key={food.id} variant="secondary" className="gap-1 pr-1">
                    {food.is_bio ? "🌿" : "🏭"} {food.name.slice(0, 40)}{food.name.length > 40 ? "…" : ""}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => toggleFood(food.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>

              {visibleImpactColumns.map(col => {
                const values = comparedFoods.map(f => (f as any)[col.key] as number | null).filter(v => v != null) as number[];
                const maxVal = Math.max(...values.map(Math.abs), 0.000001);

                return (
                  <Card key={col.key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{col.label}</CardTitle>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">{col.tooltip}</p>
                            <p className="text-xs text-muted-foreground mt-1">Unité : {col.unit}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparedFoods.map(food => {
                        const val = (food as any)[col.key] as number | null;
                        const pct = val != null ? (Math.abs(val) / maxVal) * 100 : 0;
                        return (
                          <div key={food.id} className="flex items-center gap-3">
                            <div className="w-[200px] min-w-[200px] truncate text-xs flex items-center gap-1">
                              {food.is_bio ? <Leaf className="h-3 w-3 text-green-600 shrink-0" /> : <Factory className="h-3 w-3 text-muted-foreground shrink-0" />}
                              <span className="truncate">{food.name}</span>
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-primary/70"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="w-[100px] text-right font-mono text-xs text-muted-foreground">
                              {formatScientific(val)} {col.unit.split("/")[0]}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
