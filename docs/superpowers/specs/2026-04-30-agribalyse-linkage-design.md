# Agribalyse Carbon Footprint Linkage — Design Spec

**Date**: 2026-04-30  
**Branch**: feat/menu-samples  
**Status**: Approved

## Context

The scout-menu database already has an `agribalyse_foods` table (currently empty) and `menu_ingredients.agribalyse_food_id` + `menu_ingredients.unit_multiplier` columns wired up to a CO2 formula in the frontend. The import pipeline (batch 1) inserted 165 default dishes without Agribalyse linkage. This spec adds three pipeline steps to populate Agribalyse data and link it to ingredients.

## Architecture: 2 new scripts + 1 updated script

### `scripts/seed_agribalyse.py` (new)

- Downloads the Agribalyse 3.2 Synthèse CSV directly from the ADEME public URL
- Imports **all rows** (CIQUAL raw/processed foods + GINCO prepared dishes)
- Maps CSV columns to DB columns:
  - `Nom du Produit en Français` → `name`
  - `Code_CIQUAL` or row identifier → `id` (UUID generated from code)
  - `Changement climatique` → `changement_climatique`
  - All other impact columns → snake_case equivalents
  - `Agriculture biologique` → `is_bio`
  - `Système de production` → `production_type`
- Generates `scripts/output/seed_agribalyse.sql`
  - Bulk `INSERT INTO public.agribalyse_foods ... ON CONFLICT (id) DO NOTHING`
- User pastes into Supabase SQL editor once

### `scripts/match_agribalyse.py` (new)

- Reads `scripts/output/dishes_with_ingredients.json`
- Collects all unique ingredient names (~402 unique names across 165 dishes)
- Loads Agribalyse food names from the same CSV
- Calls Claude Haiku per ingredient in parallel (10 workers):
  - Input: ingredient name + full Agribalyse name list
  - Output: best matching Agribalyse name, or `null` if no reasonable match
- Writes `scripts/output/ingredient_agribalyse_map.json`:
  ```json
  {
    "farine de blé": "Farine de blé T55",
    "huile d'olive": "Huile d'olive vierge extra",
    "sel": null
  }
  ```

### `scripts/generate_sql.py` (updated)

**New behavior at top of SQL output:**
```sql
-- Clear existing default dishes (re-imported with Agribalyse linkage below)
DELETE FROM public.menus WHERE is_default = true AND user_id IS NULL;
```
The CASCADE constraint on `menu_ingredients.menu_id` automatically deletes associated ingredients.

**Ingredient INSERTs gain two new columns:**
```sql
INSERT INTO public.menu_ingredients (menu_id, name, quantity, unit, agribalyse_food_id, unit_multiplier)
VALUES (v_menu_id, 'farine', 100, 'g',
  (SELECT id FROM agribalyse_foods WHERE name = 'Farine de blé T55' LIMIT 1),
  1.0);
```
- `agribalyse_food_id`: subquery by name from `agribalyse_foods`; `NULL` if no match
- `unit_multiplier`: mirrors app's `getRatioForUnit` — `g→1.0`, `kg→1000.0`, all other units→`1000.0`

**Reads `ingredient_agribalyse_map.json`** before generating; gracefully handles missing file (falls back to no Agribalyse linkage).

## SQL Output Versioning

| File | Contents |
|------|----------|
| `scripts/output/seed_agribalyse_1.sql` | First Agribalyse seed (~2600 rows) |
| `scripts/output/import_menus_2.sql` | 165 dishes with Agribalyse linkage (replaces batch 1) |

## Skill Update

`import-camp-menus/SKILL.md` gains:
- **Step 2.5** — `seed_agribalyse.py` (run once; idempotent via `ON CONFLICT DO NOTHING`)
- **Step 3.5** — `match_agribalyse.py` (after ingredient generation, before SQL generation)
- Updated "Previously imported batches" table with batch 2

## Unit Multiplier Logic

Mirrors the app's `getRatioForUnit` function exactly:

| Unit | unit_multiplier |
|------|----------------|
| `g` | 1.0 |
| `kg` | 1000.0 |
| everything else (ml, pièce, pincée, etc.) | 1000.0 |
