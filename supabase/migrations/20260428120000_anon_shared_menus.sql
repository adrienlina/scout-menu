-- Allow anonymous (logged-out) users to view shared and default menus,
-- their ingredients, and the referenced agribalyse foods.

CREATE POLICY "Anon can view default or shared menus"
ON public.menus FOR SELECT TO anon
USING (is_default = true OR is_shared = true);

CREATE POLICY "Anon can view ingredients of default or shared menus"
ON public.menu_ingredients FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.menus
  WHERE menus.id = menu_ingredients.menu_id
  AND (menus.is_default = true OR menus.is_shared = true)
));

CREATE POLICY "Anon can view agribalyse foods"
ON public.agribalyse_foods FOR SELECT TO anon
USING (true);
