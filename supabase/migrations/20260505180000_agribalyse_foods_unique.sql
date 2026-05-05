-- Prevent future agribalyse_foods duplicates.
--
-- Identity = normalized name + is_bio. production_type is intentionally NOT in
-- the key: dedupe diagnostics showed all duplicate pairs differed only on
-- production_type ('conventionnel' vs NULL) while sharing the same name, is_bio,
-- and impact values. Treating those as the same food matches reality.
--
-- Run scripts/dedupe_agribalyse_foods_v2.sql first; this index will fail to
-- create if duplicates remain.

CREATE UNIQUE INDEX IF NOT EXISTS agribalyse_foods_identity_uniq
  ON public.agribalyse_foods (
    lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))),
    is_bio
  );
