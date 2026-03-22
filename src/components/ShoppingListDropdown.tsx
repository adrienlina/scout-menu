import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateShoppingListDialog } from "@/components/CreateShoppingListDialog";
import type { Camp } from "@/lib/types";
import type { ShoppingList } from "@/hooks/useShoppingLists";

export function ShoppingListDropdown({
  camp,
  shoppingLists,
}: {
  camp: Camp;
  shoppingLists: ShoppingList[];
}) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Listes de courses
            {shoppingLists.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground leading-none">
                {shoppingLists.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle liste
          </DropdownMenuItem>
          {shoppingLists.length > 0 && <DropdownMenuSeparator />}
          {shoppingLists.map((sl) => (
            <DropdownMenuItem
              key={sl.id}
              onClick={() => navigate(`/camps/${camp.id}/liste/${sl.id}`)}
            >
              📋 {sl.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateShoppingListDialog camp={camp} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
