import { useDeleteCamp } from "@/hooks/useCamps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, Calendar, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

export function CampCard({ camp, index, isShared }: { camp: any; index: number; isShared: boolean }) {
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
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{camp.name}</CardTitle>
                {isShared && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Share2 className="h-3 w-3" />
                    Partagé
                  </Badge>
                )}
              </div>
              {!isShared && (
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
              )}
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
