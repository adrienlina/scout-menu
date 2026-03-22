import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
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

export function AgribalyseSearch({
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
