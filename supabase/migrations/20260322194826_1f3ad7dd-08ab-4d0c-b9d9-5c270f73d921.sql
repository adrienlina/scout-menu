
-- 1. Create camp_shares table
CREATE TABLE public.camp_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  shared_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(camp_id, invited_email)
);

ALTER TABLE public.camp_shares ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to get user email from auth.users
CREATE OR REPLACE FUNCTION public.get_auth_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id;
$$;

-- 3. Security definer function to check camp access (owner OR shared)
CREATE OR REPLACE FUNCTION public.has_camp_access(_user_id uuid, _camp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.camps WHERE id = _camp_id AND user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.camp_shares
    WHERE camp_id = _camp_id
      AND invited_email = (SELECT email FROM auth.users WHERE id = _user_id)
  );
$$;

-- 4. RLS policies for camp_shares
CREATE POLICY "Camp owners can manage shares"
  ON public.camp_shares FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps WHERE id = camp_shares.camp_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps WHERE id = camp_shares.camp_id AND user_id = auth.uid()));

CREATE POLICY "Shared users can view their shares"
  ON public.camp_shares FOR SELECT
  TO authenticated
  USING (invited_email = public.get_auth_email(auth.uid()));

-- 5. Update camps SELECT policy to include shared users
DROP POLICY IF EXISTS "Users can view own camps" ON public.camps;
CREATE POLICY "Users can view accessible camps"
  ON public.camps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_camp_access(auth.uid(), id));

-- 6. Update camps UPDATE policy
DROP POLICY IF EXISTS "Users can update own camps" ON public.camps;
CREATE POLICY "Users can update accessible camps"
  ON public.camps FOR UPDATE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), id));

-- 7. Update camp_meals policies
DROP POLICY IF EXISTS "Users can view meals of own camps" ON public.camp_meals;
CREATE POLICY "Users can view meals of accessible camps"
  ON public.camp_meals FOR SELECT
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can insert meals to own camps" ON public.camp_meals;
CREATE POLICY "Users can insert meals to accessible camps"
  ON public.camp_meals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can update meals of own camps" ON public.camp_meals;
CREATE POLICY "Users can update meals of accessible camps"
  ON public.camp_meals FOR UPDATE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can delete meals of own camps" ON public.camp_meals;
CREATE POLICY "Users can delete meals of accessible camps"
  ON public.camp_meals FOR DELETE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

-- 8. Update camp_days policies
DROP POLICY IF EXISTS "Users can view days of own camps" ON public.camp_days;
CREATE POLICY "Users can view days of accessible camps"
  ON public.camp_days FOR SELECT
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can insert days to own camps" ON public.camp_days;
CREATE POLICY "Users can insert days to accessible camps"
  ON public.camp_days FOR INSERT
  TO authenticated
  WITH CHECK (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can update days of own camps" ON public.camp_days;
CREATE POLICY "Users can update days of accessible camps"
  ON public.camp_days FOR UPDATE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can delete days of own camps" ON public.camp_days;
CREATE POLICY "Users can delete days of accessible camps"
  ON public.camp_days FOR DELETE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

-- 9. Update camp_ingredient_usage policies
DROP POLICY IF EXISTS "Users can view usage of own camps" ON public.camp_ingredient_usage;
CREATE POLICY "Users can view usage of accessible camps"
  ON public.camp_ingredient_usage FOR SELECT
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can insert usage to own camps" ON public.camp_ingredient_usage;
CREATE POLICY "Users can insert usage to accessible camps"
  ON public.camp_ingredient_usage FOR INSERT
  TO authenticated
  WITH CHECK (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can update usage of own camps" ON public.camp_ingredient_usage;
CREATE POLICY "Users can update usage of accessible camps"
  ON public.camp_ingredient_usage FOR UPDATE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Users can delete usage of own camps" ON public.camp_ingredient_usage;
CREATE POLICY "Users can delete usage of accessible camps"
  ON public.camp_ingredient_usage FOR DELETE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

-- 10. Update shopping_lists policies
DROP POLICY IF EXISTS "Camp owners can insert shopping lists" ON public.shopping_lists;
CREATE POLICY "Accessible camp users can insert shopping lists"
  ON public.shopping_lists FOR INSERT
  TO authenticated
  WITH CHECK (public.has_camp_access(auth.uid(), camp_id));

DROP POLICY IF EXISTS "Camp owners can delete shopping lists" ON public.shopping_lists;
CREATE POLICY "Accessible camp users can delete shopping lists"
  ON public.shopping_lists FOR DELETE
  TO authenticated
  USING (public.has_camp_access(auth.uid(), camp_id));

-- 11. Update shopping_list_meals INSERT policy
DROP POLICY IF EXISTS "Camp owners can insert shopping list meals" ON public.shopping_list_meals;
CREATE POLICY "Accessible camp users can insert shopping list meals"
  ON public.shopping_list_meals FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = shopping_list_meals.shopping_list_id
      AND public.has_camp_access(auth.uid(), sl.camp_id)
  ));
