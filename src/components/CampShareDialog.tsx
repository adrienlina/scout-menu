import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X, Users } from "lucide-react";
import { useCampShares, useAddCampShare, useRemoveCampShare } from "@/hooks/useCampShares";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function CampShareDialog({ campId, isOwner }: { campId: string; isOwner: boolean }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const { data: shares } = useCampShares(campId);
  const addShare = useAddCampShare();
  const removeShare = useRemoveCampShare();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!email.trim() || !user) return;
    if (email.toLowerCase().trim() === user.email) {
      toast({ title: "Vous ne pouvez pas vous inviter vous-même", variant: "destructive" });
      return;
    }
    addShare.mutate(
      { campId, email, sharedByUserId: user.id },
      {
        onSuccess: () => {
          setEmail("");
          toast({ title: "Utilisateur ajouté !" });
        },
        onError: (err) => {
          if (err instanceof Error && err.message.includes("duplicate")) {
            toast({ title: "Cet email est déjà invité", variant: "destructive" });
          } else {
            toast({ title: "Erreur lors de l'ajout", variant: "destructive" });
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Partager
          {shares && shares.length > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {shares.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager le camp</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={addShare.isPending || !email.trim()}>
              <UserPlus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </form>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {shares?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun utilisateur invité
            </p>
          )}
          {shares?.map((share) => (
            <div key={share.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">{share.invited_email}</span>
              {isOwner && (
                <button
                  onClick={() => removeShare.mutate({ id: share.id, campId })}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
