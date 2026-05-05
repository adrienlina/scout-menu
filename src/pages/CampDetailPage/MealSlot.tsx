import { useState, useMemo } from "react";
import { useAssignMeal } from "@/hooks/useCamps";
import { useMenus } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Droppable } from "@hello-pangea/dnd";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealSlotType, type CampMeal, type Menu } from "@/lib/types";
import { MealCard } from "./MealCard";

type SourceFilter = "all" | "mine" | "favoris" | "shared";

const SOURCE_FILTERS: { id: SourceFilter; label: string; icon: string }[] = [
  { id: "all", label: "Tous", icon: "" },
  { id: "mine", label: "Mes menus", icon: "📔" },
  { id: "favoris", label: "Favoris", icon: "🔖" },
  { id: "shared", label: "Publics", icon: "↗" },
];

export function MealSlot({
  campId,
  date,
  mealType,
  meals,
  participantCount,
}: {
  campId: string;
  date: string;
  mealType: MealSlotType;
  meals: CampMeal[];
  participantCount: number;
}) {
  const assignMeal = useAssignMeal();
  const { user } = useAuth();
  const { data: bookmarks } = useBookmarks();

  const { data: menus } = useMenus(mealType);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const droppableId = `slot:${date}:${mealType}`;

  const visibleSourceFilters = SOURCE_FILTERS.filter(
    (f) => (f.id !== "mine" && f.id !== "favoris") || !!user
  );

  const filteredMenus = useMemo(() => {
    if (!menus) return [];
    const q = query.trim().toLowerCase();
    return menus.filter((m) => {
      if (sourceFilter === "mine" && m.user_id !== user?.id) return false;
      if (sourceFilter === "favoris" && !bookmarks?.has(m.id)) return false;
      if (sourceFilter === "shared" && (m.user_id === user?.id || m.is_default)) return false;

      if (q) {
        const hay = [
          m.name,
          m.description ?? "",
          ...(m.menu_ingredients ?? []).map((i) => i.name),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [menus, sourceFilter, query, user?.id, bookmarks]);

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`rounded-lg border p-3 space-y-2 transition-colors ${
            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "bg-card/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {MEAL_TYPE_ICONS[mealType]} {MEAL_TYPE_LABELS[mealType]}
            </span>
          </div>

          {meals.map((meal, index) => {
            const menu = meal.menus as Menu | undefined;
            if (!menu) return null;
            return (
              <MealCard
                key={meal.id}
                meal={meal}
                menu={menu}
                index={index}
                campId={campId}
                participantCount={participantCount}
              />
            );
          })}

          {provided.placeholder}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-center rounded border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choisir un menu — {MEAL_TYPE_LABELS[mealType]}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#98A39C] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Rechercher un menu, un ingrédient…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 border border-[#E5E8E2] rounded-[10px] bg-[#F7F8F5] text-[14px] text-[#11221C] outline-none transition-all focus:border-[#1F6B4A] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,107,74,0.12)] placeholder:text-[#98A39C]"
                  />
                  {query && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-[26px] h-[26px] grid place-items-center rounded-[6px] text-[#6B7A72] hover:bg-[#EEF0EB] hover:text-[#11221C] transition-colors"
                      onClick={() => setQuery("")}
                      aria-label="Effacer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Source filter */}
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#98A39C] flex-shrink-0">Source</span>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleSourceFilters.map((f) => {
                      const active = sourceFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setSourceFilter(f.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[13px] font-medium transition-all ${
                            active
                              ? "bg-[#11221C] text-white border-[#11221C]"
                              : "border-[#E5E8E2] bg-white text-[#3B4A43] hover:border-[#98A39C]"
                          }`}
                        >
                          {f.icon && <span className={active ? "text-white" : ""}>{f.icon}</span>}
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredMenus.map((m) => (
                  <button
                    key={m.id}
                    className="w-full rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                    onClick={() => {
                      assignMeal.mutate({ campId, menuId: m.id, mealDate: date, mealType });
                      setDialogOpen(false);
                    }}
                  >
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                    {m.is_default && <Badge className="mt-1 text-xs gradient-campfire border-0 text-primary-foreground">Standard</Badge>}
                  </button>
                ))}
                {filteredMenus.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {menus?.length === 0
                      ? "Aucun menu disponible pour ce repas"
                      : "Aucun menu ne correspond aux filtres"}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Droppable>
  );
}
