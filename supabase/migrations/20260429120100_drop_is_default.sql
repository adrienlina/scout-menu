-- Drop is_default from menus and clean up RLS policies that referenced it.

DROP POLICY IF EXISTS "Users can view default or shared or own menus" ON public.menus;
DROP POLICY IF EXISTS "Anon can view default or shared menus" ON public.menus;
DROP POLICY IF EXISTS "Users can view ingredients of accessible menus" ON public.menu_ingredients;
DROP POLICY IF EXISTS "Anon can view ingredients of default or shared menus" ON public.menu_ingredients;

CREATE POLICY "Users can view shared or own menus"
ON public.menus FOR SELECT TO authenticated
USING (is_shared = true OR auth.uid() = user_id);

CREATE POLICY "Anon can view shared menus"
ON public.menus FOR SELECT TO anon
USING (is_shared = true);

CREATE POLICY "Users can view ingredients of accessible menus"
ON public.menu_ingredients FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.menus
  WHERE menus.id = menu_ingredients.menu_id
  AND (menus.is_shared = true OR menus.user_id = auth.uid())
));

CREATE POLICY "Anon can view ingredients of shared menus"
ON public.menu_ingredients FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.menus
  WHERE menus.id = menu_ingredients.menu_id
  AND menus.is_shared = true
));

ALTER TABLE public.menus DROP COLUMN is_default;
