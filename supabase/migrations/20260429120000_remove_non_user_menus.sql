-- Remove all menus that are not owned by a user (seeded standard/default menus).
-- Related menu_ingredients and camp_meals rows are removed via ON DELETE CASCADE.

DELETE FROM public.menus WHERE user_id IS NULL;
