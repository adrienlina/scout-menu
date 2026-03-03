import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, BookOpen, Tent, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl gradient-forest shadow-2xl">
          <UtensilsCrossed className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Scout<span className="text-gradient-campfire">Menu</span>
        </h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          Planifiez les repas de vos camps scouts en quelques clics. Bibliothèque de menus, calcul des quantités, export facile.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Link to={user ? "/menus" : "/auth"}>
          <Button size="lg" className="gap-2 px-8">
            <BookOpen className="h-5 w-5" />
            Voir les menus
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to={user ? "/camps" : "/auth"}>
          <Button size="lg" variant="outline" className="gap-2 px-8">
            <Tent className="h-5 w-5" />
            Planifier un camp
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid gap-6 pt-8 sm:grid-cols-3 max-w-2xl"
      >
        {[
          { icon: "📚", title: "Bibliothèque", desc: "Menus standards + vos créations" },
          { icon: "📅", title: "Planning", desc: "Assignez les repas jour par jour" },
          { icon: "🧮", title: "Quantités", desc: "Calcul automatique selon les participants" },
        ].map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="rounded-xl border bg-card p-5 text-center space-y-2"
          >
            <div className="text-3xl">{feature.icon}</div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
