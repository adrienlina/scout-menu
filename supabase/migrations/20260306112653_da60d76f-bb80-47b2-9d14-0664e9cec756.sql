
-- Shopping lists table
CREATE TABLE public.shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Liste de courses',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view (for sharing via link)
CREATE POLICY "Authenticated users can view shopping lists"
  ON public.shopping_lists FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Camp owners can insert shopping lists"
  ON public.shopping_lists FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM camps WHERE camps.id = shopping_lists.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Camp owners can delete shopping lists"
  ON public.shopping_lists FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = shopping_lists.camp_id AND camps.user_id = auth.uid()));

-- Shopping list meals (which camp_meals are included)
CREATE TABLE public.shopping_list_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  camp_meal_id uuid NOT NULL REFERENCES public.camp_meals(id) ON DELETE CASCADE,
  UNIQUE(shopping_list_id, camp_meal_id)
);

ALTER TABLE public.shopping_list_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shopping list meals"
  ON public.shopping_list_meals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Camp owners can insert shopping list meals"
  ON public.shopping_list_meals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM shopping_lists sl JOIN camps c ON c.id = sl.camp_id
    WHERE sl.id = shopping_list_meals.shopping_list_id AND c.user_id = auth.uid()
  ));

-- Shopping list checks (realtime checkbox state)
CREATE TABLE public.shopping_list_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shopping_list_id, ingredient_key)
);

ALTER TABLE public.shopping_list_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shopping list checks"
  ON public.shopping_list_checks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert shopping list checks"
  ON public.shopping_list_checks FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shopping list checks"
  ON public.shopping_list_checks FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime for checks
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_checks;
