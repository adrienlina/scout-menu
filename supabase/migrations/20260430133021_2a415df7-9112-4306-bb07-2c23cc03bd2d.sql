CREATE TABLE IF NOT EXISTS public.agribalyse_food_default_ratios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agribalyse_food_id uuid NOT NULL REFERENCES public.agribalyse_foods(id) ON DELETE CASCADE,
  unit text NOT NULL,
  grams_per_unit numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agribalyse_food_id, unit)
);

ALTER TABLE public.agribalyse_food_default_ratios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view default ratios"
  ON public.agribalyse_food_default_ratios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert default ratios"
  ON public.agribalyse_food_default_ratios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update default ratios"
  ON public.agribalyse_food_default_ratios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete default ratios"
  ON public.agribalyse_food_default_ratios FOR DELETE TO authenticated USING (true);