# Scout Menu

Application web open source de planification des repas pour les intendant·e·s en camp scout.

Adresse actuelle : https://scout-menu.lovable.app/

## Fonctionnalités

- **Menus** — Créez, modifiez et partagez des menus avec leurs ingrédients (nom, quantité, unité). Filtrez par type de repas (petit-déjeuner, déjeuner/dîner, goûter) ou par propriétaire.
- **Camps** — Planifiez les repas sur une grille par jour et type de repas, avec glisser-déposer. Gérez les participants par tranche d'âge (Oranges, Bleus, Rouges, Adultes) avec multiplicateurs de portions.
- **Listes de courses** — Générez des listes par repas, par jour ou pour tout le camp. Cochez les articles en temps réel avec synchronisation multi-utilisateurs.
- **Stock** — Suivez les quantités réellement utilisées repas par repas.
- **Bilan carbone** — Associez vos ingrédients à la base de données Agribalyse et visualisez l'empreinte carbone de vos menus et de votre camp.
- **Partage** — Partagez vos menus (privé/public) et vos camps avec d'autres utilisateurs par email. Exportez en CSV.

## Stack technique

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (bundler)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) (base de données, authentification, temps réel)
- [TanStack Query](https://tanstack.com/query) (state serveur)
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) (tests)

## Démarrage

**Prérequis** : Node.js 18+ et npm ([installer avec nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

```sh
# Cloner le dépôt
git clone <YOUR_GIT_URL>
cd scout-menu

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

### Variables d'environnement

Créez un fichier `.env.local` à la racine avec vos clés Supabase :

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Commandes utiles

```sh
npm run dev        # Serveur de développement (hot reload)
npm run build      # Build de production
npm run preview    # Prévisualiser le build
npm test           # Lancer les tests
npm run test:watch # Tests en mode watch
npm run lint       # Linter ESLint
```

## Contribuer

Scout Menu est en développement actif et cherche des contributeur·ice·s techniques et fonctionnel·le·s. Voir [contributing.md](contributing.md) pour plus d'informations.

## Roadmap

Voir [roadmap.md](roadmap.md) pour le détail des fonctionnalités en cours et à venir.
