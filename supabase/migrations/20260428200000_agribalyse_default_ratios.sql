-- Default conversion ratios from "unit -> grams" per Agribalyse food.
-- Used to auto-fill menu_ingredients.unit_multiplier when an ingredient is
-- linked to an Agribalyse food (or its unit changes).

CREATE TABLE public.agribalyse_food_default_ratios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agribalyse_food_id UUID NOT NULL REFERENCES public.agribalyse_foods(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  grams_per_unit DECIMAL NOT NULL CHECK (grams_per_unit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agribalyse_food_id, unit)
);

CREATE INDEX agribalyse_food_default_ratios_food_idx
  ON public.agribalyse_food_default_ratios (agribalyse_food_id);

ALTER TABLE public.agribalyse_food_default_ratios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view default ratios"
  ON public.agribalyse_food_default_ratios FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert default ratios"
  ON public.agribalyse_food_default_ratios FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update default ratios"
  ON public.agribalyse_food_default_ratios FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete default ratios"
  ON public.agribalyse_food_default_ratios FOR DELETE TO authenticated
  USING (true);
