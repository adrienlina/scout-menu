import { useState } from "react";
import { useCamps } from "@/hooks/useCamps";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Tent } from "lucide-react";
import { CampCard } from "./CampCard";
import { CreateCampForm } from "./CreateCampForm";

export default function CampsPage() {
  const { data: camps, isLoading } = useCamps();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🏕️ Mes camps</h1>
          <p className="text-muted-foreground">Planifiez les repas de vos camps scouts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau camp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un camp</DialogTitle>
            </DialogHeader>
            <CreateCampForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-32 rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-16 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : camps && camps.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {camps.map((camp, i) => (
            <CampCard key={camp.id} camp={camp} index={i} isShared={camp.user_id !== user?.id} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <Tent className="mx-auto mb-4 h-16 w-16 opacity-20" />
          <p className="text-lg">Aucun camp créé</p>
          <p className="text-sm">Créez votre premier camp pour commencer à planifier les menus !</p>
        </div>
      )}
    </div>
  );
}
