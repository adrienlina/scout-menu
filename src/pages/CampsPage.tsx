import { useState } from "react";
import { useCamps, useCreateCamp, useDeleteCamp } from "@/hooks/useCamps";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Tent, Trash2, Users, Calendar, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

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

function CampCard({ camp, index }: { camp: any; index: number }) {
  const deleteCamp = useDeleteCamp();
  const { toast } = useToast();
  const mealCount = camp.camp_meals?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/camps/${camp.id}`}>
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{camp.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteCamp.mutate(camp.id, {
                    onSuccess: () => toast({ title: "Camp supprimé" }),
                  });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(camp.start_date), "d MMM", { locale: fr })} → {format(new Date(camp.end_date), "d MMM yyyy", { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{camp.participant_count} participants</span>
            </div>
            <p className="text-xs text-muted-foreground">{mealCount} repas planifiés</p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function CreateCampForm({ onSuccess }: { onSuccess: () => void }) {
  const createCamp = useCreateCamp();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState("20");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCamp.mutateAsync({
        name,
        startDate,
        endDate,
        participantCount: parseInt(participants),
      });
      toast({ title: "Camp créé !" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du camp</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camp d'été 2026" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Date de fin</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Nombre de participants</Label>
        <Input type="number" value={participants} onChange={(e) => setParticipants(e.target.value)} min="1" required />
      </div>
      <Button type="submit" className="w-full" disabled={createCamp.isPending}>
        {createCamp.isPending ? "Création..." : "Créer le camp"}
      </Button>
    </form>
  );
}
