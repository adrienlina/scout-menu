
CREATE TABLE public.agribalyse_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  production_type text,
  is_bio boolean NOT NULL DEFAULT false,
  score_unique_ef numeric,
  changement_climatique numeric,
  ozone numeric,
  rayonnements_ionisants numeric,
  formation_ozone numeric,
  particules numeric,
  toxicite_non_cancerogene numeric,
  toxicite_cancerogene numeric,
  acidification numeric,
  eutrophisation_eaux_douces numeric,
  eutrophisation_marine numeric,
  eutrophisation_terrestre numeric,
  ecotoxicite_eau_douce numeric,
  utilisation_sol numeric,
  epuisement_eau numeric,
  epuisement_energie numeric,
  epuisement_mineraux numeric,
  cc_biogenique numeric,
  cc_fossile numeric,
  cc_affectation_sols numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agribalyse_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view agribalyse foods"
  ON public.agribalyse_foods FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert agribalyse foods"
  ON public.agribalyse_foods FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can delete agribalyse foods"
  ON public.agribalyse_foods FOR DELETE TO authenticated
  USING (true);
