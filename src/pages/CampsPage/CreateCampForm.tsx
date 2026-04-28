import { useState } from "react";
import { useCreateCamp } from "@/hooks/useCamps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function CreateCampForm({ onSuccess }: { onSuccess: () => void }) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Erreur", description: message, variant: "destructive" });
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
