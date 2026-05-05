-- Safety net: keep the original value in a legacy column so the merge
-- (dejeuner + diner -> meal) can be reversed manually if needed.
ALTER TABLE public.menus      ADD COLUMN IF NOT EXISTS meal_type_legacy text;
ALTER TABLE public.camp_meals ADD COLUMN IF NOT EXISTS meal_type_legacy text;
UPDATE public.menus      SET meal_type_legacy = meal_type WHERE meal_type_legacy IS NULL;
UPDATE public.camp_meals SET meal_type_legacy = meal_type WHERE meal_type_legacy IS NULL;

-- Drop old check constraints
ALTER TABLE public.menus      DROP CONSTRAINT IF EXISTS menus_meal_type_check;
ALTER TABLE public.camp_meals DROP CONSTRAINT IF EXISTS camp_meals_meal_type_check;

-- Migrate menus: merge dejeuner+diner -> meal, rename others
UPDATE public.menus SET meal_type = 'breakfast' WHERE meal_type = 'petit-dejeuner';
UPDATE public.menus SET meal_type = 'meal'      WHERE meal_type IN ('dejeuner', 'diner');
UPDATE public.menus SET meal_type = 'snack'     WHERE meal_type = 'gouter';

-- Migrate camp_meals: same mapping (no "all" for camp slots)
UPDATE public.camp_meals SET meal_type = 'breakfast' WHERE meal_type = 'petit-dejeuner';
UPDATE public.camp_meals SET meal_type = 'meal'      WHERE meal_type IN ('dejeuner', 'diner');
UPDATE public.camp_meals SET meal_type = 'snack'     WHERE meal_type = 'gouter';

-- Add new check constraints
ALTER TABLE public.menus
  ADD CONSTRAINT menus_meal_type_check
  CHECK (meal_type IN ('breakfast', 'meal', 'snack', 'all'));

ALTER TABLE public.camp_meals
  ADD CONSTRAINT camp_meals_meal_type_check
  CHECK (meal_type IN ('breakfast', 'meal', 'snack'));

-- Rollback recipe (run manually if you need to revert):
--   ALTER TABLE public.menus      DROP CONSTRAINT menus_meal_type_check;
--   ALTER TABLE public.camp_meals DROP CONSTRAINT camp_meals_meal_type_check;
--   UPDATE public.menus      SET meal_type = meal_type_legacy WHERE meal_type_legacy IS NOT NULL;
--   UPDATE public.camp_meals SET meal_type = meal_type_legacy WHERE meal_type_legacy IS NOT NULL;
--   ALTER TABLE public.menus
--     ADD CONSTRAINT menus_meal_type_check
--     CHECK (meal_type IN ('petit-dejeuner', 'dejeuner', 'gouter', 'diner'));
--   ALTER TABLE public.camp_meals
--     ADD CONSTRAINT camp_meals_meal_type_check
--     CHECK (meal_type IN ('petit-dejeuner', 'dejeuner', 'gouter', 'diner'));
--   ALTER TABLE public.menus      DROP COLUMN meal_type_legacy;
--   ALTER TABLE public.camp_meals DROP COLUMN meal_type_legacy;
