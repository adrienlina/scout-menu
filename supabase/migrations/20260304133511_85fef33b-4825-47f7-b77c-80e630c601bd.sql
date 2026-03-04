
-- Create camp_days table for per-day participant count
CREATE TABLE public.camp_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  participant_count integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(camp_id, day_date)
);

ALTER TABLE public.camp_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view days of own camps" ON public.camp_days
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_days.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can insert days to own camps" ON public.camp_days
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_days.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can update days of own camps" ON public.camp_days
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_days.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can delete days of own camps" ON public.camp_days
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_days.camp_id AND camps.user_id = auth.uid()));
