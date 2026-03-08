import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Search, X, Info, Leaf, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const IMPACT_COLUMNS = [
  { key: "score_unique_ef", label: "Score unique EF 3.1", unit: "mPt/kg", tooltip: "Score agrégé unique selon la méthode Environmental Footprint 3.1. Plus le score est élevé, plus l'impact environnemental global est important." },
  { key: "changement_climatique", label: "Changement climatique", unit: "kg CO₂ eq/kg", tooltip: "Émissions de gaz à effet de serre contribuant au réchauffement global, exprimées en équivalent CO₂." },
  { key: "ozone", label: "Couche d'ozone", unit: "kg CFC-11 eq/kg", tooltip: "Appauvrissement de la couche d'ozone stratosphérique qui protège des rayons UV." },
  { key: "rayonnements_ionisants", label: "Rayonnements ionisants", unit: "kBq U-235 eq/kg", tooltip: "Exposition aux rayonnements ionisants, principalement liée à la production d'énergie nucléaire." },
  { key: "formation_ozone", label: "Formation d'ozone", unit: "kg NMVOC eq/kg", tooltip: "Formation d'ozone photochimique (smog) au niveau du sol, nocif pour la santé et la végétation." },
  { key: "particules", label: "Particules fines", unit: "disease inc./kg", tooltip: "Émissions de particules fines pouvant causer des maladies respiratoires et cardiovasculaires." },
  { key: "toxicite_non_cancerogene", label: "Toxicité non-cancérogène", unit: "CTUh/kg", tooltip: "Effets toxiques non cancérogènes sur la santé humaine liés à l'exposition aux polluants chimiques." },
  { key: "toxicite_cancerogene", label: "Toxicité cancérogène", unit: "CTUh/kg", tooltip: "Effets cancérogènes potentiels sur la santé humaine liés à l'exposition aux polluants chimiques." },
  { key: "acidification", label: "Acidification", unit: "mol H⁺ eq/kg", tooltip: "Acidification des sols et des eaux douces, principalement causée par les émissions de SO₂ et NOx." },
  { key: "eutrophisation_eaux_douces", label: "Eutrophisation eaux douces", unit: "kg P eq/kg", tooltip: "Enrichissement excessif en nutriments (phosphore) des eaux douces, provoquant la prolifération d'algues." },
  { key: "eutrophisation_marine", label: "Eutrophisation marine", unit: "kg N eq/kg", tooltip: "Enrichissement excessif en nutriments (azote) des milieux marins." },
  { key: "eutrophisation_terrestre", label: "Eutrophisation terrestre", unit: "mol N eq/kg", tooltip: "Enrichissement excessif en nutriments des sols terrestres, affectant la biodiversité." },
  { key: "ecotoxicite_eau_douce", label: "Écotoxicité eau douce", unit: "CTUe/kg", tooltip: "Effets toxiques sur les écosystèmes aquatiques d'eau douce." },
  { key: "utilisation_sol", label: "Utilisation du sol", unit: "Pt/kg", tooltip: "Impact lié à l'utilisation et la transformation des terres agricoles sur la biodiversité." },
  { key: "epuisement_eau", label: "Épuisement eau", unit: "m³ depriv./kg", tooltip: "Consommation d'eau douce menant à sa raréfaction pour les autres utilisateurs." },
  { key: "epuisement_energie", label: "Épuisement énergie", unit: "MJ/kg", tooltip: "Consommation de ressources énergétiques fossiles (pétrole, gaz, charbon)." },
  { key: "epuisement_mineraux", label: "Épuisement minéraux", unit: "kg Sb eq/kg", tooltip: "Consommation de ressources minérales non renouvelables (métaux, minerais)." },
  { key: "cc_biogenique", label: "CC - Biogénique", unit: "kg CO₂ eq/kg", tooltip: "Sous-indicateur du changement climatique : émissions biogéniques (cycle naturel du carbone)." },
  { key: "cc_fossile", label: "CC - Fossile", unit: "kg CO₂ eq/kg", tooltip: "Sous-indicateur du changement climatique : émissions liées aux combustibles fossiles." },
  { key: "cc_affectation_sols", label: "CC - Affectation sols", unit: "kg CO₂ eq/kg", tooltip: "Sous-indicateur du changement climatique : émissions liées au changement d'affectation des sols (déforestation, etc.)." },
] as const;

type ImpactKey = typeof IMPACT_COLUMNS[number]["key"];

const DEFAULT_IMPACTS: ImpactKey[] = ["changement_climatique", "score_unique_ef"];

const EXCEL_COL_MAP: Record<string, ImpactKey> = {
  "Score unique EF 3.1": "score_unique_ef",
  "Changement climatique": "changement_climatique",
  "Appauvrissement de la couche d'ozone": "ozone",
  "Rayonnements ionisants": "rayonnements_ionisants",
  "Formation photochimique d'ozone": "formation_ozone",
  "Particules fines": "particules",
  "Effets toxicologiques sur la santé humaine : substances non-cancérogènes": "toxicite_non_cancerogene",
  "Effets toxicologiques sur la santé humaine : substances cancérogènes": "toxicite_cancerogene",
  "Acidification terrestre et eaux douces": "acidification",
  "Eutrophisation eaux douces": "eutrophisation_eaux_douces",
  "Eutrophisation marine": "eutrophisation_marine",
  "Eutrophisation terrestre": "eutrophisation_terrestre",
  "Écotoxicité pour écosystèmes aquatiques d'eau douce": "ecotoxicite_eau_douce",
  "Utilisation du sol": "utilisation_sol",
  "Épuisement des ressources eau": "epuisement_eau",
  "Épuisement des ressources énergétiques": "epuisement_energie",
  "Épuisement des ressources minéraux": "epuisement_mineraux",
  "Changement climatique - émissions biogéniques": "cc_biogenique",
  "Changement climatique - émissions fossiles": "cc_fossile",
  "Changement climatique - émissions liées au changement d'affectation des sols": "cc_affectation_sols",
};

function formatScientific(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export default function AgribalysePage() {
  const [search, setSearch] = useState("");
  const [selectedImpacts, setSelectedImpacts] = useState<ImpactKey[]>(DEFAULT_IMPACTS);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [showImpactSelector, setShowImpactSelector] = useState(false);

  const { data: foods = [], isLoading, refetch } = useQuery({
    queryKey: ["agribalyse_foods"],
    queryFn: async () => {
      // Fetch all records (may be more than 1000)
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("agribalyse_foods")
          .select("*")
          .order("name")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const filteredFoods = useMemo(() => {
    if (selectedFoods.size > 0) {
      return foods.filter((f: any) => selectedFoods.has(f.id));
    }
    if (!search.trim()) return foods.slice(0, 50);
    const q = search.toLowerCase();
    return foods.filter((f: any) => f.name.toLowerCase().includes(q)).slice(0, 50);
  }, [foods, search, selectedFoods]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return foods
      .filter((f: any) => f.name.toLowerCase().includes(q) && !selectedFoods.has(f.id))
      .slice(0, 10);
  }, [foods, search, selectedFoods]);

  const toggleImpact = (key: ImpactKey) => {
    setSelectedImpacts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleFood = (id: string) => {
    setSelectedFoods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      
      // Find "Synthèse" or "Synthese" sheet
      const sheetName = workbook.SheetNames.find(
        (n) => n.toLowerCase().includes("synth")
      );
      if (!sheetName) {
        toast.error("Onglet 'Synthèse' introuvable");
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

      // Find header row (contains "Nom du Produit en Français")
      let headerIdx = -1;
      let nameCol = -1;
      const colMap: Record<number, ImpactKey> = {};

      for (let i = 0; i < Math.min(json.length, 10); i++) {
        const row = json[i];
        if (!row) continue;
        const ni = row.findIndex((c: any) => typeof c === "string" && c.includes("Nom du Produit en Fran"));
        if (ni >= 0) {
          headerIdx = i;
          nameCol = ni;
          // Map impact columns
          for (let j = 0; j < row.length; j++) {
            const header = String(row[j] || "").trim();
            for (const [excelName, dbKey] of Object.entries(EXCEL_COL_MAP)) {
              if (header.includes(excelName) || excelName.includes(header)) {
                colMap[j] = dbKey;
              }
            }
          }
          break;
        }
      }

      if (headerIdx === -1) {
        toast.error("En-têtes introuvables dans l'onglet Synthèse");
        return;
      }

      const rows = json.slice(headerIdx + 1).filter((r) => r && r[nameCol]);
      const foods = rows.map((row) => {
        const entry: any = {
          name: String(row[nameCol]).trim(),
          is_bio: false,
          production_type: "conventionnel",
        };
        for (const [colIdx, dbKey] of Object.entries(colMap)) {
          const val = row[Number(colIdx)];
          entry[dbKey] = val !== null && val !== undefined && val !== "" ? Number(val) : null;
        }
        return entry;
      }).filter((e) => e.name && e.name.length > 0);

      // Batch insert (chunks of 500)
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < foods.length; i += chunkSize) {
        const chunk = foods.slice(i, i + chunkSize);
        const { error } = await supabase.from("agribalyse_foods").insert(chunk);
        if (error) {
          console.error("Insert error:", error);
          toast.error(`Erreur à l'insertion (lot ${Math.floor(i / chunkSize) + 1}): ${error.message}`);
          return;
        }
        inserted += chunk.length;
      }

      toast.success(`${inserted} aliments importés avec succès !`);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'import : " + err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }, [refetch]);

  const selectedImpactCols = IMPACT_COLUMNS.filter((c) => selectedImpacts.includes(c.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            Agribalyse
          </h1>
          <p className="text-muted-foreground mt-1">
            Impacts environnementaux des aliments — Base Agribalyse 3.2
          </p>
        </div>
        {foods.length === 0 && (
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="agribalyse-import"
              disabled={importing}
            />
            <label htmlFor="agribalyse-import">
              <Button asChild variant="default" disabled={importing}>
                <span className="cursor-pointer gap-2">
                  <Upload className="h-4 w-4" />
                  {importing ? "Import en cours…" : "Importer le fichier Excel"}
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {foods.length > 0 && (
        <>
          {/* Search & compare */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un aliment pour le comparer…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImpactSelector(!showImpactSelector)}
                  className="gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  Indicateurs ({selectedImpacts.length})
                </Button>
              </div>

              {/* Selected foods badges */}
              {selectedFoods.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground self-center">Comparaison :</span>
                  {foods
                    .filter((f: any) => selectedFoods.has(f.id))
                    .map((f: any) => (
                      <Badge key={f.id} variant="secondary" className="gap-1">
                        {f.name}
                        <button onClick={() => toggleFood(f.id)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFoods(new Set())}>
                    Tout effacer
                  </Button>
                </div>
              )}

              {/* Search results to add to comparison */}
              {search.trim() && searchResults.length > 0 && selectedFoods.size > 0 && (
                <div className="border rounded-md divide-y max-h-48 overflow-auto">
                  {searchResults.map((f: any) => (
                    <button
                      key={f.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => { toggleFood(f.id); setSearch(""); }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impact selector */}
          {showImpactSelector && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sélectionner les indicateurs à afficher</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {IMPACT_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1.5">
                      <Checkbox
                        checked={selectedImpacts.includes(col.key)}
                        onCheckedChange={() => toggleImpact(col.key)}
                      />
                      <span>{col.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{col.tooltip}</TooltipContent>
                      </Tooltip>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[50px]"></TableHead>
                      <TableHead className="sticky left-[50px] bg-background z-10 min-w-[250px]">Aliment</TableHead>
                      {selectedImpactCols.map((col) => (
                        <TableHead key={col.key} className="text-right min-w-[130px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center justify-end gap-1">
                                {col.label}
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{col.tooltip}</p>
                              <p className="text-xs text-muted-foreground mt-1">Unité : {col.unit}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={selectedImpactCols.length + 2} className="text-center py-8 text-muted-foreground">
                          Chargement…
                        </TableCell>
                      </TableRow>
                    ) : filteredFoods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedImpactCols.length + 2} className="text-center py-8 text-muted-foreground">
                          Aucun résultat
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFoods.map((food: any) => (
                        <TableRow
                          key={food.id}
                          className={selectedFoods.has(food.id) ? "bg-primary/5" : ""}
                        >
                          <TableCell className="sticky left-0 bg-background z-10">
                            <Checkbox
                              checked={selectedFoods.has(food.id)}
                              onCheckedChange={() => toggleFood(food.id)}
                            />
                          </TableCell>
                          <TableCell className="sticky left-[50px] bg-background z-10 font-medium">
                            {food.name}
                          </TableCell>
                          {selectedImpactCols.map((col) => (
                            <TableCell key={col.key} className="text-right tabular-nums">
                              {formatScientific(food[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {selectedFoods.size === 0 && (
                <p className="text-xs text-muted-foreground px-4 py-2 border-t">
                  {search.trim()
                    ? `${filteredFoods.length} résultat(s) — max. 50 affichés`
                    : `${foods.length} aliments en base — affichage des 50 premiers. Utilisez la recherche ou la comparaison.`}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {foods.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Leaf className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucune donnée Agribalyse importée</p>
            <p className="mt-1">Importez le fichier Excel Agribalyse pour commencer.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
