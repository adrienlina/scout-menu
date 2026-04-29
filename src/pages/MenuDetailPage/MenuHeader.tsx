import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Share2, Pencil, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, type MealType, type Menu } from "@/lib/types";
import type { TablesUpdate } from "@/integrations/supabase/types";


export function MenuHeader({ menu, isOwner }: { menu: Menu; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [name, setName] = useState(menu.name);
  const [description, setDescription] = useState(menu.description || "");

  useEffect(() => {
    setName(menu.name);
    setDescription(menu.description || "");
  }, [menu.name, menu.description]);

  const updateField = useMutation({
    mutationFn: async (fields: TablesUpdate<"menus">) => {
      const { error } = await supabase
        .from("menus")
        .update(fields)
        .eq("id", menu.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-detail", menu.id] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    },
  });

  const saveName = () => {
    if (name.trim() && name !== menu.name) {
      updateField.mutate({ name: name.trim() });
    }
    setEditingName(false);
  };

  const saveDescription = () => {
    if (description !== (menu.description || "")) {
      updateField.mutate({ description: description.trim() || null });
    }
    setEditingDesc(false);
  };

  const toggleShared = () => {
    updateField.mutate(
      { is_shared: !menu.is_shared },
      { onSuccess: () => toast({ title: menu.is_shared ? "Menu rendu privé" : "Menu rendu public !" }) }
    );
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/menus/${menu.id}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !", description: "Partagez-le avec qui vous voulez." });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Title */}
        {isOwner && editingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold h-10"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setName(menu.name); setEditingName(false); } }}
              onBlur={saveName}
            />
          </div>
        ) : (
          <h1
            className={`text-2xl font-bold tracking-tight ${isOwner ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
            onClick={() => isOwner && setEditingName(true)}
            title={isOwner ? "Cliquer pour modifier" : undefined}
          >
            {menu.name}
            {isOwner && <Pencil className="inline ml-2 h-4 w-4 text-muted-foreground" />}
          </h1>
        )}

        {/* Meal type */}
        {isOwner ? (
          <Select
            value={menu.meal_type}
            onValueChange={(v) => updateField.mutate({ meal_type: v })}
          >
            <SelectTrigger className="w-auto h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="petit-dejeuner">☀️ Petit-déjeuner</SelectItem>
              <SelectItem value="dejeuner">🍽️ Déjeuner/Dîner</SelectItem>
              <SelectItem value="gouter">🍪 Goûter</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {MEAL_TYPE_ICONS[menu.meal_type as MealType]} {MEAL_TYPE_LABELS[menu.meal_type as MealType]}
          </Badge>
        )}

        {/* Share toggle */}
        {isOwner && !menu.is_default && (
          <div className="flex items-center gap-2 ml-auto">
            <Share2 className={`h-4 w-4 ${menu.is_shared ? "text-primary" : "text-muted-foreground"}`} />
            <Label htmlFor="share-toggle" className="text-sm text-muted-foreground cursor-pointer">
              {menu.is_shared ? "Public" : "Privé"}
            </Label>
            <Switch
              id="share-toggle"
              checked={menu.is_shared}
              onCheckedChange={toggleShared}
            />
            {menu.is_shared && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyShareLink}>
                <Copy className="h-3.5 w-3.5" />
                Copier le lien
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {isOwner && editingDesc ? (
        <RichTextEditor
          value={description}
          onChange={setDescription}
          onBlur={saveDescription}
          autoFocus
        />
      ) : (
        <div
          className={isOwner ? "cursor-pointer group" : ""}
          onClick={() => isOwner && setEditingDesc(true)}
          title={isOwner ? "Cliquer pour modifier" : undefined}
        >
          {menu.description ? (
            <div className="flex items-start gap-1">
              <RichTextDisplay content={menu.description} />
              {isOwner && <Pencil className="shrink-0 mt-0.5 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          ) : isOwner ? (
            <p className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Ajouter une description… <Pencil className="inline ml-1 h-3 w-3" />
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
