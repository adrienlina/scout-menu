
-- 1) menu_bookmarks
create table if not exists public.menu_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, menu_id)
);
alter table public.menu_bookmarks enable row level security;
drop policy if exists "Users can manage their own bookmarks" on public.menu_bookmarks;
create policy "Users can manage their own bookmarks"
  on public.menu_bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) rename meal types
ALTER TABLE public.menus      ADD COLUMN IF NOT EXISTS meal_type_legacy text;
ALTER TABLE public.camp_meals ADD COLUMN IF NOT EXISTS meal_type_legacy text;
UPDATE public.menus      SET meal_type_legacy = meal_type WHERE meal_type_legacy IS NULL;
UPDATE public.camp_meals SET meal_type_legacy = meal_type WHERE meal_type_legacy IS NULL;

ALTER TABLE public.menus      DROP CONSTRAINT IF EXISTS menus_meal_type_check;
ALTER TABLE public.camp_meals DROP CONSTRAINT IF EXISTS camp_meals_meal_type_check;

UPDATE public.menus SET meal_type = 'breakfast' WHERE meal_type = 'petit-dejeuner';
UPDATE public.menus SET meal_type = 'meal'      WHERE meal_type IN ('dejeuner', 'diner');
UPDATE public.menus SET meal_type = 'snack'     WHERE meal_type = 'gouter';

UPDATE public.camp_meals SET meal_type = 'breakfast' WHERE meal_type = 'petit-dejeuner';
UPDATE public.camp_meals SET meal_type = 'meal'      WHERE meal_type IN ('dejeuner', 'diner');
UPDATE public.camp_meals SET meal_type = 'snack'     WHERE meal_type = 'gouter';

ALTER TABLE public.menus
  ADD CONSTRAINT menus_meal_type_check
  CHECK (meal_type IN ('breakfast', 'meal', 'snack', 'all'));
ALTER TABLE public.camp_meals
  ADD CONSTRAINT camp_meals_meal_type_check
  CHECK (meal_type IN ('breakfast', 'meal', 'snack'));

-- 3) anon shared menus
drop policy if exists "Anon can view default or shared menus" on public.menus;
CREATE POLICY "Anon can view default or shared menus"
ON public.menus FOR SELECT TO anon
USING (is_default = true OR is_shared = true);

drop policy if exists "Anon can view ingredients of default or shared menus" on public.menu_ingredients;
CREATE POLICY "Anon can view ingredients of default or shared menus"
ON public.menu_ingredients FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.menus
  WHERE menus.id = menu_ingredients.menu_id
  AND (menus.is_default = true OR menus.is_shared = true)
));

drop policy if exists "Anon can view agribalyse foods" on public.agribalyse_foods;
CREATE POLICY "Anon can view agribalyse foods"
ON public.agribalyse_foods FOR SELECT TO anon
USING (true);
