import { useNavigate } from "react-router-dom";
import { useDeleteMenu, useToggleShared, type MenuWithProfile } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Share2, Clock, Users, Bookmark, BookmarkCheck, Leaf } from "lucide-react";
import { type MealType, type MealSlotType, getMenuCO2 } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { useToggleBookmark } from "@/hooks/useBookmarks";

const MEAL_META: Record<MealType, { accent: string; bg: string; fg: string; label: string; icon: React.ReactNode }> = {
  breakfast: {
    accent: "#F59E0B",
    bg: "#FEF3C7",
    fg: "#92400E",
    label: "Petit-déjeuner",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    ),
  },
  meal: {
    accent: "#EA580C",
    bg: "#FED7AA",
    fg: "#9A3412",
    label: "Déjeuner / Dîner",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 11h18" /><path d="M12 11V3" />
        <path d="M5 11a7 7 0 0 0 14 0" /><path d="M5 21h14" />
      </svg>
    ),
  },
  snack: {
    accent: "#DB2777",
    bg: "#FBCFE8",
    fg: "#9D174D",
    label: "Goûter",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M6 13h12l-1 8H7l-1-8z" />
        <path d="M5 13a7 7 0 0 1 14 0" />
        <path d="M9 8c0-1.5 1-2.5 1-4" />
        <path d="M13 8c0-1.5 1-2.5 1-4" />
      </svg>
    ),
  },
  all: {
    accent: "#0EA5E9",
    bg: "#E0F2FE",
    fg: "#075985",
    label: "Tous repas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
};

const OWNERSHIP_META = {
  mine: { label: "Le mien", color: "#0F766E", bg: "#0F766E18", border: "#0F766E40" },
  standard: { label: "Standard", color: "#B45309", bg: "#B4530918", border: "#B4530940" },
  shared: { label: "Publics", color: "#1D4ED8", bg: "#1D4ED818", border: "#1D4ED840" },
};

function getOwnershipKey(menu: MenuWithProfile, userId?: string): keyof typeof OWNERSHIP_META | null {
  if (menu.is_default) return "standard";
  if (menu.user_id === userId) return "mine";
  if (menu.is_shared) return "shared";
  return null;
}

const MAX_INGREDIENTS_GRID = 4;

export function MenuCard({
  menu,
  index,
  canDelete,
  view = "grid",
  isBookmarked = false,
}: {
  menu: MenuWithProfile;
  index: number;
  canDelete: boolean;
  view?: "grid" | "list";
  isBookmarked?: boolean;
}) {
  const navigate = useNavigate();
  const deleteMenu = useDeleteMenu();
  const toggleShared = useToggleShared();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOwner = menu.user_id === user?.id;

  const meta = MEAL_META[menu.meal_type as MealType] ?? MEAL_META.meal;
  const ownershipKey = getOwnershipKey(menu, user?.id);
  const own = ownershipKey ? OWNERSHIP_META[ownershipKey] : null;

  const ings = menu.menu_ingredients ?? [];
  const visibleIngs = ings.slice(0, MAX_INGREDIENTS_GRID);
  const moreCount = ings.length - MAX_INGREDIENTS_GRID;
  const co2 = getMenuCO2(menu, 1);
  const toggleBookmark = useToggleBookmark();

  if (view === "list") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="relative flex items-center gap-4 bg-white border border-[#E5E8E2] rounded-[14px] px-4 py-3 overflow-hidden cursor-pointer group transition-all duration-150 hover:border-[#98A39C] hover:shadow-[0_1px_3px_rgba(17,34,28,0.06),0_4px_12px_rgba(17,34,28,0.04)] hover:-translate-y-px"
        onClick={() => navigate(`/menus/${menu.id}`)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[14px]" style={{ background: meta.accent }} />

        <div className="flex-shrink-0 w-9 h-9 rounded-[10px] grid place-items-center" style={{ background: meta.bg, color: meta.fg }}>
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-bold tracking-tight text-[#11221C] truncate">{menu.name}</h3>
          {ings.length > 0 && (
            <p className="text-[12px] text-[#6B7A72] mt-0.5 truncate">
              {ings.map((i) => i.name).join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 text-[12px] text-[#6B7A72]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: meta.bg, color: meta.fg }}>
            {meta.label}
          </span>
          {co2 > 0 && (
            <span className="inline-flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-[#1F6B4A]" />
              {co2.toFixed(2)} kg CO₂
            </span>
          )}
          {own && ownershipKey !== "standard" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border" style={{ color: own.color, background: own.bg, borderColor: own.border }}>
              {own.label}
            </span>
          )}
          {menu.creator_name && !isOwner && (
            <span className="text-[#6B7A72]">{menu.creator_name}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Bookmark — always visible */}
          {user && (
            <button
              className={`w-8 h-8 grid place-items-center rounded-lg transition-colors ${isBookmarked ? "text-[#1F6B4A]" : "text-[#98A39C] hover:bg-[#EEF0EB] hover:text-[#11221C]"}`}
              aria-label={isBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark.mutate({ menuId: menu.id, bookmarked: isBookmarked });
              }}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}

          {/* Owner actions — on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isOwner && !menu.is_default && (
              <button
                className="w-8 h-8 grid place-items-center rounded-lg text-[#6B7A72] hover:bg-[#EEF0EB] hover:text-[#11221C] transition-colors"
                title={menu.is_shared ? "Rendre privé" : "Rendre public"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShared.mutate(
                    { menuId: menu.id, isShared: !menu.is_shared },
                    { onSuccess: () => toast({ title: menu.is_shared ? "Menu rendu privé" : "Menu rendu public !" }) }
                  );
                }}
              >
                <Share2 className={`h-4 w-4 ${menu.is_shared ? "text-[#1F6B4A]" : ""}`} />
              </button>
            )}
            {canDelete && (
              <button
                className="w-8 h-8 grid place-items-center rounded-lg text-[#6B7A72] hover:bg-red-50 hover:text-red-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMenu.mutate(menu.id, { onSuccess: () => toast({ title: "Menu supprimé" }) });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            className="px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#1F6B4A] text-white hover:bg-[#18563B] transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/menus/${menu.id}`); }}
          >
            Ouvrir
          </button>
        </div>
      </motion.article>
    );
  }

  // Grid view
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative flex flex-col gap-3.5 bg-white border border-[#E5E8E2] rounded-[14px] p-[18px] pl-[22px] overflow-hidden cursor-pointer group transition-all duration-150 hover:border-[#98A39C] hover:shadow-[0_1px_3px_rgba(17,34,28,0.06),0_4px_12px_rgba(17,34,28,0.04)] hover:-translate-y-px"
      onClick={() => navigate(`/menus/${menu.id}`)}
    >
      {/* Left stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: meta.accent }} />

      {/* Card head */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-[10px] grid place-items-center" style={{ background: meta.bg, color: meta.fg }}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-bold tracking-tight text-[#11221C] truncate">{menu.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: meta.bg, color: meta.fg }}>
              {meta.label}
            </span>
            {own && ownershipKey !== "standard" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border" style={{ color: own.color, background: own.bg, borderColor: own.border }}>
                {own.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions (hover) */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {isOwner && !menu.is_default && (
            <button
              className="w-8 h-8 grid place-items-center rounded-lg text-[#6B7A72] hover:bg-[#EEF0EB] hover:text-[#11221C] transition-colors"
              title={menu.is_shared ? "Rendre privé" : "Rendre public"}
              onClick={(e) => {
                e.stopPropagation();
                toggleShared.mutate(
                  { menuId: menu.id, isShared: !menu.is_shared },
                  { onSuccess: () => toast({ title: menu.is_shared ? "Menu rendu privé" : "Menu rendu public !" }) }
                );
              }}
            >
              <Share2 className={`h-4 w-4 ${menu.is_shared ? "text-[#1F6B4A]" : ""}`} />
            </button>
          )}
          {canDelete && (
            <button
              className="w-8 h-8 grid place-items-center rounded-lg text-[#6B7A72] hover:bg-red-50 hover:text-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteMenu.mutate(menu.id, { onSuccess: () => toast({ title: "Menu supprimé" }) });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {menu.description && (
        <RichTextDisplay content={menu.description} clamp className="[&_*]:text-[13.5px] [&_*]:text-[#3B4A43] [&_*]:leading-[1.5]" />
      )}

      {/* Meta row */}
      <div className="flex items-center flex-wrap gap-1.5 text-[12.5px] text-[#6B7A72]">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          par pers.
        </span>
        {co2 > 0 && (
          <>
            <span className="text-[#98A39C]">·</span>
            <span className="inline-flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-[#1F6B4A]" />
              {co2.toFixed(2)} kg CO₂
            </span>
          </>
        )}
        {menu.creator_name && !isOwner && (
          <>
            <span className="text-[#98A39C]">·</span>
            <span className="inline-flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              {menu.creator_name}
            </span>
          </>
        )}
      </div>

      {/* Ingredients */}
      {ings.length > 0 && (
        <div className="bg-[#F7F8F5] rounded-[10px] px-3 py-2.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#6B7A72]">Ingrédients</span>
            <span className="text-[11px] font-semibold text-[#98A39C] bg-white px-2 py-0.5 rounded-full border border-[#E5E8E2]">{ings.length}</span>
          </div>
          <ul className="flex flex-wrap gap-1">
            {visibleIngs.map((ing) => (
              <li key={ing.id} className="inline-flex items-baseline gap-1 bg-white border border-[#E5E8E2] rounded-[6px] px-2 py-1 text-[12px]">
                <span className="text-[#3B4A43] font-medium">{ing.name}</span>
                <span className="text-[#6B7A72] text-[11px] tabular-nums">{ing.quantity}{ing.unit}</span>
              </li>
            ))}
            {moreCount > 0 && (
              <li className="inline-flex items-center bg-transparent border border-dashed border-[#E5E8E2] rounded-[6px] px-2 py-1 text-[12px] font-semibold text-[#6B7A72]">
                +{moreCount}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Card actions */}
      <div className="flex justify-end gap-2 mt-auto pt-0.5">
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-white border border-[#E5E8E2] text-[#3B4A43] hover:border-[#98A39C] hover:text-[#11221C] transition-colors"
          onClick={(e) => { e.stopPropagation(); navigate(`/menus/${menu.id}`); }}
        >
          Ouvrir
        </button>
      </div>
    </motion.article>
  );
}
