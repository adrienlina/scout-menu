import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenus } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, ChefHat } from "lucide-react";
import { MENU_FILTER_TYPES, MEAL_FILTER_LABELS, MEAL_FILTER_ICONS, type MealTypeFilter } from "@/lib/types";
import { MenuCard } from "./MenuCard";

export default function MenusPage() {
  const navigate = useNavigate();
  const { data: menus, isLoading } = useMenus();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<MealTypeFilter | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine" | "standard" | "others">("all");
  const [searchCreator, setSearchCreator] = useState("");

  const filtered = menus?.filter((m) => {
    if (filterType !== "all") {
      const types = filterType === "repas" ? ["dejeuner", "diner"] : [filterType];
      if (!types.includes(m.meal_type)) return false;
    }
    if (ownerFilter === "mine" && m.user_id !== user?.id) return false;
    if (ownerFilter === "standard" && !m.is_default) return false;
    if (ownerFilter === "others" && (m.user_id === user?.id || m.is_default)) return false;
    if (ownerFilter === "others" && searchCreator && m.creator_name && !m.creator_name.toLowerCase().includes(searchCreator.toLowerCase())) return false;
    if (ownerFilter === "others" && searchCreator && !m.creator_name) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📚 Bibliothèque de menus</h1>
          <p className="text-muted-foreground">Explorez et créez vos menus pour le camp</p>
        </div>
        <Button className="gap-2" onClick={() => navigate(user ? "/menus/new" : "/auth")}>
          <Plus className="h-4 w-4" />
          {user ? "Nouveau menu" : "Se connecter pour créer"}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          Tous
        </Button>
        {MENU_FILTER_TYPES.map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {MEAL_FILTER_ICONS[type]} {MEAL_FILTER_LABELS[type]}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(["all", "mine", "standard", "others"] as const)
          .filter((f) => f !== "mine" || !!user)
          .map((f) => (
          <Button
            key={f}
            variant={ownerFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => { setOwnerFilter(f); if (f !== "others") setSearchCreator(""); }}
          >
            {f === "all" && "👥 Tous"}
            {f === "mine" && "🙋 Mes menus"}
            {f === "standard" && "⭐ Standards"}
            {f === "others" && "🌍 Partagés"}
          </Button>
        ))}
        {ownerFilter === "others" && (
          <Input
            placeholder="Rechercher par pseudo…"
            value={searchCreator}
            onChange={(e) => setSearchCreator(e.target.value)}
            className="w-48 h-8 text-sm"
          />
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-32 rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-20 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((menu, i) => (
            <MenuCard key={menu.id} menu={menu} index={i} canDelete={menu.user_id === user?.id} />
          ))}
          {filtered?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <ChefHat className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>Aucun menu trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
