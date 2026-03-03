import { useState } from "react";
import { useMenus, useCreateMenu, useDeleteMenu } from "@/hooks/useMenus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ChefHat, X } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function MenusPage() {
  const { data: menus, isLoading } = useMenus();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<MealType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = menus?.filter(
    (m) => filterType === "all" || m.meal_type === filterType
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📚 Bibliothèque de menus</h1>
          <p className="text-muted-foreground">Explorez et créez vos menus pour le camp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau menu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un menu</DialogTitle>
            </DialogHeader>
            <CreateMenuForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          Tous
        </Button>
        {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {MEAL_TYPE_ICONS[type]} {MEAL_TYPE_LABELS[type]}
          </Button>
        ))}
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

function MenuCard({ menu, index, canDelete }: { menu: any; index: number; canDelete: boolean }) {
  const deleteMenu = useDeleteMenu();
  const { toast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{menu.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {MEAL_TYPE_ICONS[menu.meal_type as MealType]} {MEAL_TYPE_LABELS[menu.meal_type as MealType]}
              </Badge>
            </div>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  deleteMenu.mutate(menu.id, {
                    onSuccess: () => toast({ title: "Menu supprimé" }),
                  });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {menu.description && (
            <p className="mb-3 text-sm text-muted-foreground">{menu.description}</p>
          )}
          {menu.menu_ingredients && menu.menu_ingredients.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingrédients par personne</p>
              <div className="flex flex-wrap gap-1">
                {menu.menu_ingredients.map((ing: any) => (
                  <Badge key={ing.id} variant="outline" className="text-xs font-normal">
                    {ing.name} · {ing.quantity}{ing.unit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {menu.is_default && (
            <Badge className="mt-2 gradient-campfire border-0 text-primary-foreground text-xs">Standard</Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CreateMenuForm({ onSuccess }: { onSuccess: () => void }) {
  const createMenu = useCreateMenu();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("dejeuner");
  const [ingredients, setIngredients] = useState<{ name: string; quantity: number; unit: string }[]>([]);
  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingUnit, setIngUnit] = useState("g");

  const addIngredient = () => {
    if (!ingName || !ingQty) return;
    setIngredients([...ingredients, { name: ingName, quantity: parseFloat(ingQty), unit: ingUnit }]);
    setIngName("");
    setIngQty("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMenu.mutateAsync({ name, description, mealType, ingredients });
      toast({ title: "Menu créé !" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du menu</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pâtes carbonara" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description optionnelle..." />
      </div>
      <div className="space-y-2">
        <Label>Type de repas</Label>
        <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((t) => (
              <SelectItem key={t} value={t}>{MEAL_TYPE_ICONS[t]} {MEAL_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Ingrédients (par personne)</Label>
        <div className="flex gap-2">
          <Input value={ingName} onChange={(e) => setIngName(e.target.value)} placeholder="Nom" className="flex-1" />
          <Input value={ingQty} onChange={(e) => setIngQty(e.target.value)} placeholder="Qté" type="number" step="0.1" className="w-20" />
          <Select value={ingUnit} onValueChange={setIngUnit}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["g", "kg", "ml", "L", "pièce"].map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={addIngredient}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {ingredients.map((ing, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {ing.name} · {ing.quantity}{ing.unit}
                <button type="button" onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={createMenu.isPending}>
        {createMenu.isPending ? "Création..." : "Créer le menu"}
      </Button>
    </form>
  );
}
