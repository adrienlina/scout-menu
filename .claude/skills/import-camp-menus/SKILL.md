---
name: import-camp-menus
description: Use when the user has new SGDF camp HTML files to import into scout-menu, or wants to re-run the menu extraction pipeline (parse HTML → split dishes → generate ingredients → import to Supabase).
---

# Import Camp Menus from SGDF HTML

## Overview

Pipeline that turns saved SGDF camp pages (monprojet.sgdf.fr) into scout-menu recipes with per-person ingredient lists.

## Prerequisites

```bash
# Python venv with dependencies (already committed)
uv venv scripts/.venv
uv pip install anthropic supabase python-dotenv --python scripts/.venv

# Required env vars in .env
ANTHROPIC_API_KEY=...           # already set in shell
```

## Pipeline Steps

### 1. Add HTML files
Place saved SGDF camp HTML pages (File → Save As in browser) into `ideas/`.

### 2. Parse HTML → JSON
```bash
# One file
scripts/.venv/bin/python scripts/parse_camp_html.py "ideas/Camp n°XXXXX - Mon Projet SGDF.html"

# All files → merge
mkdir -p scripts/output
for f in ideas/*.html; do
  name=$(basename "$f" ".html")
  scripts/.venv/bin/python scripts/parse_camp_html.py "$f" > "scripts/output/${name}.json" 2>/dev/null
done

# Merge into raw_menus.json (skip empty/errored files)
python3 -c "
import json, glob
camps = []
for f in sorted(glob.glob('scripts/output/Camp*.json')):
    try:
        d = json.load(open(f))
        if d.get('days'): camps.append(d)
    except: pass
json.dump(camps, open('scripts/output/raw_menus.json','w'), ensure_ascii=False, indent=2)
print(f'{len(camps)} camps')
"
```

Output: `scripts/output/raw_menus.json`

### 2.5. Seed Agribalyse foods table (run once, idempotent)

Reads `scripts/data/agribalyse_food_products.xlsx` (download from dataverse ID 641911 if missing):
```bash
curl -L -o scripts/data/agribalyse_food_products.xlsx \
  "https://entrepot.recherche.data.gouv.fr/api/access/datafile/641911"
```

Then generate and import the seed SQL:
```bash
scripts/.venv/bin/python scripts/seed_agribalyse.py
# → scripts/output/seed_agribalyse.sql
```

Paste into the Supabase SQL editor. Uses `ON CONFLICT DO NOTHING` — safe to re-run.

### 3. Split meal descriptions into dishes
Uses Claude Sonnet. Deduplicates across all camps.

```bash
scripts/.venv/bin/python scripts/split_dishes.py
```

Output: `scripts/output/unique_dishes.json`

### 4. Generate ingredients per dish
Uses Claude Haiku in parallel (10 workers). Quantities are for 1 person.

```bash
scripts/.venv/bin/python scripts/generate_ingredients.py
```

Output: `scripts/output/dishes_with_ingredients.json`

### 3.5. Match ingredients to Agribalyse entries

Uses Claude Haiku (batches of 20) to match each unique ingredient name to the closest Agribalyse food. Reads `dishes_with_ingredients.json` and the Agribalyse XLSX.

```bash
scripts/.venv/bin/python scripts/match_agribalyse.py
# → scripts/output/ingredient_agribalyse_map.json
```

~94% match rate. `null` entries mean no reasonable Agribalyse match found.

### 5. Generate SQL and import to Supabase
Generates a SQL script that inserts `is_default=true` menus. Idempotent (skips existing dishes by name).

```bash
scripts/.venv/bin/python scripts/generate_sql.py
# → scripts/output/import_menus.sql
```

Name the output file with an incrementing suffix before committing (e.g. `import_menus_2.sql`, `import_menus_3.sql`) so each batch is traceable.

Paste the contents into the **Supabase SQL editor**:
https://supabase.com/dashboard/project/yjbrzyjdapvfaknjltxm/sql/new

The final `SELECT COUNT(*)` at the end confirms how many default menus exist after the import.

### Previously imported batches

| File | Dishes | Agribalyse | Date |
|------|--------|------------|------|
| `scripts/output/import_menus_1.sql` | 165 | no | 2026-04-30 |
| `scripts/output/import_menus_2.sql` | 165 | yes (377/402 ingredients linked) | 2026-04-30 |

### Agribalyse seed batches

| File | Rows | Date |
|------|------|------|
| `scripts/output/seed_agribalyse_1.sql` | 2458 | 2026-04-30 |

## Notes

- Camps with no menus filled in (empty Menus tab) are silently skipped by the parser.
- Descriptions that are activity names (`concours cuisine`, `cocu goûter`, `X`, `N.A`) produce 0 ingredients — expected.
- The Haiku model sometimes wraps JSON in ` ```json ``` ` fences — the script strips them automatically.
- Re-running import is safe: existing dishes (matched by name, case-insensitive) are skipped.

## Output File Locations

| File | Contents |
|------|----------|
| `scripts/output/raw_menus.json` | All camps → days → meals with raw descriptions |
| `scripts/output/unique_dishes.json` | Deduplicated dish names with source descriptions |
| `scripts/output/dishes_with_ingredients.json` | Final: dishes + per-person ingredients |
| `scripts/output/ingredient_agribalyse_map.json` | Ingredient name → Agribalyse food name (or null) |
| `scripts/output/seed_agribalyse.sql` | Latest Agribalyse seed SQL (version with suffix before committing) |
| `scripts/data/agribalyse_food_products.xlsx` | Agribalyse 3.2 XLSX (not committed, download from dataverse) |
