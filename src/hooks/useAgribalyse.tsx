import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { IMPACT_COLUMNS } from "@/lib/agribalyse";

export type AgribalyseFood = {
  id: string;
  name: string;
  production_type: string | null;
  is_bio: boolean;
  score_unique_ef: number | null;
  changement_climatique: number | null;
  ozone: number | null;
  rayonnements_ionisants: number | null;
  formation_ozone: number | null;
  particules: number | null;
  toxicite_non_cancerogene: number | null;
  toxicite_cancerogene: number | null;
  acidification: number | null;
  eutrophisation_eaux_douces: number | null;
  eutrophisation_marine: number | null;
  eutrophisation_terrestre: number | null;
  ecotoxicite_eau_douce: number | null;
  utilisation_sol: number | null;
  epuisement_eau: number | null;
  epuisement_energie: number | null;
  epuisement_mineraux: number | null;
  cc_biogenique: number | null;
  cc_fossile: number | null;
  cc_affectation_sols: number | null;
};

export function useAgribalyseFoods() {
  return useQuery({
    queryKey: ["agribalyse_foods"],
    queryFn: async () => {
      // Fetch all - may need pagination for large datasets
      let allData: AgribalyseFood[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("agribalyse_foods")
          .select("*")
          .range(from, from + batchSize - 1)
          .order("name");
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allData as AgribalyseFood[];
    },
  });
}

const IMPACT_KEYS = IMPACT_COLUMNS.map(c => c.key);

function parseExcelFile(buffer: ArrayBuffer, isBio: boolean): Omit<AgribalyseFood, "id">[] {
  const wb = XLSX.read(buffer, { type: "array" });
  // The data sheet is the 3rd sheet (index 2)
  const sheetName = wb.SheetNames[2];
  const ws = wb.Sheets[sheetName];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Find header row - look for row with "Nom du Produit" in column A
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const cell = String(raw[i]?.[0] || "");
    if (cell.includes("Nom du Produit") || cell.includes("Nom du produit")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 2; // fallback: row 3 (0-indexed: 2)

  const results: Omit<AgribalyseFood, "id">[] = [];
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[0] || String(row[0]).trim() === "") continue;

    const name = String(row[0]).trim();
    const productionType = row[2] ? String(row[2]).trim() : null;

    const impacts: Record<string, number | null> = {};
    for (let j = 0; j < IMPACT_KEYS.length; j++) {
      const val = row[4 + j]; // columns E onwards = index 4+
      impacts[IMPACT_KEYS[j]] = val != null && val !== "" ? Number(val) : null;
    }

    results.push({
      name,
      production_type: productionType,
      is_bio: isBio,
      ...impacts,
    } as any);
  }
  return results;
}

export function useImportAgribalyse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check if data already exists
      const { count } = await supabase
        .from("agribalyse_foods")
        .select("*", { count: "exact", head: true });
      if (count && count > 0) return { imported: 0, message: "Données déjà importées" };

      // Fetch and parse both files
      const [bioResp, convResp] = await Promise.all([
        fetch("/data/agribalyse_bio.xlsx"),
        fetch("/data/agribalyse_conv.xlsx"),
      ]);
      const [bioBuf, convBuf] = await Promise.all([
        bioResp.arrayBuffer(),
        convResp.arrayBuffer(),
      ]);

      const bioData = parseExcelFile(bioBuf, true);
      const convData = parseExcelFile(convBuf, false);
      const allData = [...bioData, ...convData];

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < allData.length; i += batchSize) {
        const batch = allData.slice(i, i + batchSize);
        const { error } = await supabase.from("agribalyse_foods").insert(batch as any);
        if (error) throw error;
      }

      return { imported: allData.length, message: `${allData.length} aliments importés` };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agribalyse_foods"] });
    },
  });
}
