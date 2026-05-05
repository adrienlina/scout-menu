import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMenus } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { MENU_FILTER_TYPES, MEAL_TYPE_LABELS, type MealSlotType } from "@/lib/types";
import { MenuCard } from "./MenuCard";
import { Search, X, LayoutGrid, List, Plus } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

type SourceFilter = "all" | "mine" | "favoris" | "shared";

const SOURCE_FILTERS: { id: SourceFilter; label: string; icon: string }[] = [
  { id: "all", label: "Tous", icon: "" },
  { id: "mine", label: "Mes menus", icon: "📔" },
  { id: "favoris", label: "Favoris", icon: "🔖" },
  { id: "shared", label: "Publics", icon: "↗" },
];

const TYPE_FILTER_COLORS: Partial<Record<MealSlotType | "all", { accent: string; bg: string; fg: string }>> = {
  breakfast: { accent: "#F59E0B", bg: "#FEF3C7", fg: "#92400E" },
  meal:      { accent: "#EA580C", bg: "#FED7AA", fg: "#9A3412" },
  snack:     { accent: "#DB2777", bg: "#FBCFE8", fg: "#9D174D" },
};

export default function MenusPage() {
  const navigate = useNavigate();
  const { data: menus, isLoading } = useMenus();
  const { user } = useAuth();
  const { data: bookmarks } = useBookmarks();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MealSlotType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    if (!menus) return [];
    const q = query.trim().toLowerCase();

    return menus.filter((m) => {
      // Type filter — also show "all" menus in every specific filter
      if (typeFilter !== "all") {
        if (m.meal_type !== typeFilter && m.meal_type !== "all") return false;
      }

      // Source filter
      if (sourceFilter === "mine" && m.user_id !== user?.id) return false;
      if (sourceFilter === "favoris" && !bookmarks?.has(m.id)) return false;
      if (sourceFilter === "shared" && (m.user_id === user?.id || m.is_default)) return false;

      // Text search
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
  }, [menus, typeFilter, sourceFilter, query, user?.id]);

  const typeFilters: Array<{ id: MealSlotType | "all"; label: string }> = [
    { id: "all", label: "Tous" },
    ...MENU_FILTER_TYPES.map((t) => ({ id: t, label: MEAL_TYPE_LABELS[t] })),
  ];

  const visibleSourceFilters = SOURCE_FILTERS.filter(
    (f) => (f.id !== "mine" && f.id !== "favoris") || !!user
  );

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#11221C] flex items-center gap-3">
            <span aria-hidden>📚</span>
            Bibliothèque de menus
          </h1>
          <p className="text-[15px] text-[#6B7A72] mt-1.5">Explorez et créez vos menus pour le camp</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#E5E8E2] rounded-[14px] px-3.5 pt-3.5 pb-4 !mb-4 shadow-[0_1px_2px_rgba(17,34,28,0.04)] flex flex-col gap-3">
        {/* Row 1: Search + view + new */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
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

          {/* View toggle */}
          <div className="inline-flex bg-[#F7F8F5] border border-[#E5E8E2] rounded-[10px] p-[3px]">
            <button
              className={`w-8 h-[30px] rounded-[7px] grid place-items-center transition-all ${view === "grid" ? "bg-white text-[#11221C] shadow-[0_1px_2px_rgba(17,34,28,0.04)]" : "text-[#6B7A72]"}`}
              onClick={() => setView("grid")}
              aria-label="Grille"
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`w-8 h-[30px] rounded-[7px] grid place-items-center transition-all ${view === "list" ? "bg-white text-[#11221C] shadow-[0_1px_2px_rgba(17,34,28,0.04)]" : "text-[#6B7A72]"}`}
              onClick={() => setView("list")}
              aria-label="Liste"
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold bg-[#1F6B4A] text-white hover:bg-[#18563B] active:translate-y-px transition-all whitespace-nowrap"
            onClick={() => navigate(user ? "/menus/new" : "/auth")}
          >
            <Plus className="w-4 h-4" />
            <span>{user ? "Nouveau menu" : "Se connecter"}</span>
          </button>
        </div>

        {/* Row 2: Filters + count */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type filter */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#98A39C] flex-shrink-0">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {typeFilters.map((f) => {
                const active = typeFilter === f.id;
                const colors = TYPE_FILTER_COLORS[f.id];
                return (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[13px] font-medium transition-all ${
                      active
                        ? "border-transparent"
                        : "border-[#E5E8E2] bg-white text-[#3B4A43] hover:border-[#98A39C]"
                    }`}
                    style={
                      active && colors
                        ? { background: colors.bg, color: colors.fg, borderColor: colors.bg }
                        : active
                        ? { background: "#11221C", color: "white", borderColor: "#11221C" }
                        : undefined
                    }
                  >
                    {f.id !== "all" && colors && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: active ? colors.fg : colors.accent }}
                      />
                    )}
                    {f.id === "all" && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? "white" : "#98A39C" }} />
                    )}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-[#E5E8E2] my-1 flex-shrink-0" aria-hidden />

          {/* Source filter */}
          <div className="flex items-center gap-2.5 min-w-0">
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

          {/* Result count */}
          <div className="ml-auto text-[13px] text-[#6B7A72] whitespace-nowrap flex-shrink-0">
            <strong className="text-[#11221C] font-bold">{filtered.length}</strong>
            <span> / {menus?.length ?? 0} menus</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E8E2] rounded-[14px] animate-pulse"
              style={{ height: view === "grid" ? 220 : 68 }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-[#E5E8E2] rounded-[14px]">
          <div className="text-4xl mb-3">{query ? "🔍" : "🍽️"}</div>
          <h3 className="text-[17px] font-bold text-[#11221C] mb-1">
            {query ? "Aucun menu trouvé" : "Aucun menu"}
          </h3>
          <p className="text-[#6B7A72] mb-4">
            {query ? "Essayez d'ajuster votre recherche ou vos filtres." : "Créez votre premier menu pour commencer."}
          </p>
          {(query || typeFilter !== "all" || sourceFilter !== "all") && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold bg-white border border-[#E5E8E2] text-[#3B4A43] hover:border-[#98A39C] transition-colors"
              onClick={() => { setQuery(""); setTypeFilter("all"); setSourceFilter("all"); }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((menu, i) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              index={i}
              canDelete={menu.user_id === user?.id}
              view="grid"
              isBookmarked={bookmarks?.has(menu.id) ?? false}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((menu, i) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              index={i}
              canDelete={menu.user_id === user?.id}
              view="list"
              isBookmarked={bookmarks?.has(menu.id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
