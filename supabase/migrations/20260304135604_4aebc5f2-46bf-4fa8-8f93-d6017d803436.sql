
-- Add is_shared column to menus
ALTER TABLE public.menus ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Update SELECT policy to also allow viewing shared menus
DROP POLICY IF EXISTS "Users can view default menus and own menus" ON public.menus;
CREATE POLICY "Users can view default or shared or own menus"
ON public.menus FOR SELECT TO authenticated
USING ((is_default = true) OR (is_shared = true) OR (auth.uid() = user_id));

-- Also allow viewing ingredients of shared menus
DROP POLICY IF EXISTS "Users can view ingredients of accessible menus" ON public.menu_ingredients;
CREATE POLICY "Users can view ingredients of accessible menus"
ON public.menu_ingredients FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM menus
  WHERE menus.id = menu_ingredients.menu_id
  AND (menus.is_default = true OR menus.is_shared = true OR menus.user_id = auth.uid())
));
