import { useParams, useNavigate } from "react-router-dom";
import { useCamp } from "@/hooks/useCamps";
import { useIngredientUsage } from "@/hooks/useStock";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import { ShoppingListStock } from "./ShoppingListStock";

export default function StockPage() {
  const { campId } = useParams<{ campId: string }>();
  const navigate = useNavigate();
  const { data: camp } = useCamp(campId!);
  const { data: usage } = useIngredientUsage(campId!);
  const { data: shoppingLists } = useShoppingLists(campId!);

  if (!camp) {
    return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/camps/${campId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Stock — {camp.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi des ingrédients achetés et consommés
          </p>
        </div>
      </div>

      {shoppingLists?.map((sl) => (
        <ShoppingListStock
          key={sl.id}
          listId={sl.id}
          listName={sl.name}
          camp={camp}
          usage={usage || []}
        />
      ))}

      {(!shoppingLists || shoppingLists.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune liste de courses. Créez-en une depuis la page du camp.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
