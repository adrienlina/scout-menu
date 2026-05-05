-- Accent- and punctuation-insensitive search for agribalyse foods.
-- Results are sorted shortest-name-first so more specific matches surface early.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Strips accents, lowercases, and collapses punctuation/whitespace runs to a
-- single space so that e.g. "Côte-de-bœuf" and "cote de boeuf" normalize
-- identically.
CREATE OR REPLACE FUNCTION normalize_search_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(lower(unaccent(regexp_replace(input, '[[:punct:]\s]+', ' ', 'g'))))
$$;

CREATE OR REPLACE FUNCTION search_agribalyse_foods(query text)
RETURNS TABLE(id text, name text, changement_climatique float8)
LANGUAGE sql
STABLE
AS $$
  SELECT id, name, changement_climatique
  FROM agribalyse_foods
  WHERE normalize_search_text(name) LIKE '%' || normalize_search_text(query) || '%'
  ORDER BY length(name) ASC, name ASC
  LIMIT 20;
$$;
