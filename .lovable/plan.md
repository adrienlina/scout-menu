

## Plan : Rich text pour la description des menus (avec paste d'images)

### Approche

Tiptap + Supabase Storage. Le contenu HTML est stocké dans `menus.description` (colonne existante). Les images collées sont uploadées automatiquement dans un bucket Storage, et leur URL publique est insérée dans l'éditeur.

### 1. Créer le bucket Storage

Migration SQL :
- Créer un bucket `menu-images` (public)
- RLS : authenticated users can INSERT, SELECT ; owners can DELETE

### 2. Installer les dépendances

`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`

### 3. Créer `src/components/RichTextEditor.tsx`

- Wrapper Tiptap avec barre d'outils : H1, H2, H3, Gras, Italique, Image (par URL)
- Props : `content`, `onChange`, `editable`, `placeholder`, `onImagePaste`
- Gestion du paste d'images : intercepter l'événement `paste`, extraire les fichiers image du clipboard, appeler `onImagePaste(file)` qui retourne l'URL publique, puis insérer l'image dans l'éditeur
- Styles avec Tailwind `prose prose-sm`

### 4. Créer `src/pages/MenuDetailPage/MenuDescription.tsx`

- Composant dédié avec logique de sauvegarde debounce (~1s)
- Fonction `uploadImage(file)` : upload vers `menu-images/{menuId}/{uuid}.{ext}`, retourne l'URL publique
- Passe `onImagePaste` au `RichTextEditor`
- Mode lecture seule pour les non-propriétaires (rendu HTML avec `prose`)

### 5. Modifier `src/pages/MenuDetailPage/MenuHeader.tsx`

- Remplacer le bloc description (`editingDesc` + `<Input>` + `<p>`) par `<MenuDescription>`
- Supprimer les états `editingDesc` et `description`
- L'éditeur est toujours visible, `editable` selon `isOwner`

### Détails techniques

- Upload : `supabase.storage.from('menu-images').upload(path, file)`
- URL publique : `supabase.storage.from('menu-images').getPublicUrl(path)`
- Les anciennes descriptions texte brut s'afficheront normalement (Tiptap les wrappe dans `<p>`)
- Formats image acceptés au paste : PNG, JPEG, GIF, WebP

