

## Plan : Rendre le nom, la quantité et l'unité d'un ingrédient éditables inline

Actuellement, le nom, la quantité et l'unité d'un ingrédient sont affichés en texte statique dans le tableau. On va les rendre éditables directement dans la ligne pour le propriétaire du menu.

### Modifications

**1. `src/pages/MenuDetailPage/IngredientTableRow.tsx`**

- Ajouter une mutation `updateIngredient` qui met à jour `name`, `quantity` et `unit` dans `menu_ingredients`.
- Pour le **nom** (ligne 68) : remplacer le texte statique par un `<Input>` éditable (si `isOwner`), avec un `onBlur` / debounce qui déclenche la mutation.
- Pour la **quantité** (ligne 69) : remplacer par un `<NumberInput>` (le composant standard du projet), avec `onChange` qui sauvegarde.
- Pour l'**unité** (ligne 70) : remplacer par un `<Select>` avec les mêmes options que dans `AddIngredientForm` (`g`, `kg`, `ml`, `L`, `pièce`). Au changement d'unité, mettre à jour automatiquement le `unit_multiplier` (comme dans `AddIngredientForm` : g→1, kg→1000, etc.) en même temps que l'unité.
- Pour les non-propriétaires, garder l'affichage texte actuel.

### Détails techniques

- La mutation `updateIngredient` fera un `supabase.from("menu_ingredients").update({ name, quantity, unit, unit_multiplier }).eq("id", ingredient.id)`.
- Le changement de nom utilise un état local + `onBlur` pour éviter de déclencher une requête à chaque frappe.
- Le changement de quantité utilise `NumberInput` avec `onChange` (sauvegarde immédiate comme le multiplier existant).
- Le changement d'unité via `Select` déclenche la mutation immédiatement et met aussi à jour le `unit_multiplier` automatiquement.

