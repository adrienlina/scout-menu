
ALTER TABLE public.camp_days
  ADD COLUMN count_orange integer NOT NULL DEFAULT 0,
  ADD COLUMN count_bleu integer NOT NULL DEFAULT 0,
  ADD COLUMN count_rouge integer NOT NULL DEFAULT 0,
  ADD COLUMN count_adulte integer NOT NULL DEFAULT 0;
