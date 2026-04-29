import { useNavigate } from "react-router-dom";
import { useDeleteMenu, useToggleShared, type MenuWithProfile } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Share2 } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { motion } from "framer-motion";

export function MenuCard({ menu, index, canDelete }: { menu: MenuWithProfile; index: number; canDelete: boolean }) {
  const navigate = useNavigate();
  const deleteMenu = useDeleteMenu();
  const toggleShared = useToggleShared();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOwner = menu.user_id === user?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg cursor-pointer" onClick={() => navigate(`/menus/${menu.id}`)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{menu.name}</CardTitle>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {(menu.meal_type === "dejeuner" || menu.meal_type === "diner") ? "🍽️ Repas" : `${MEAL_TYPE_ICONS[menu.meal_type as MealType]} ${MEAL_TYPE_LABELS[menu.meal_type as MealType]}`}
                </Badge>
                {menu.is_shared && !isOwner && menu.creator_name && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Share2 className="h-3 w-3" />
                    {menu.creator_name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={menu.is_shared ? "Rendre privé" : "Rendre public"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShared.mutate(
                      { menuId: menu.id, isShared: !menu.is_shared },
                      {
                        onSuccess: () =>
                          toast({ title: menu.is_shared ? "Menu rendu privé" : "Menu rendu public !" }),
                      }
                    );
                  }}
                >
                  <Share2 className={`h-4 w-4 ${menu.is_shared ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMenu.mutate(menu.id, {
                      onSuccess: () => toast({ title: "Menu supprimé" }),
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {menu.description && (
            <RichTextDisplay content={menu.description} clamp className="mb-3" />
          )}
          {menu.menu_ingredients && menu.menu_ingredients.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingrédients par personne</p>
              <div className="flex flex-wrap gap-1">
                {menu.menu_ingredients.map((ing) => (
                  <Badge key={ing.id} variant="outline" className="text-xs font-normal">
                    {ing.name} · {ing.quantity}{ing.unit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {menu.is_shared && isOwner && (
            <Badge variant="secondary" className="mt-2 text-xs gap-1">
              <Share2 className="h-3 w-3" /> Public
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
