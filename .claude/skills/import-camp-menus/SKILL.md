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
VITE_SUPABASE_URL=...           # already in .env
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase Dashboard → Project Settings → API → service_role
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

### 5. Generate SQL and import to Supabase
Generates a SQL script that inserts `is_default=true` menus. Idempotent (skips existing dishes by name).

```bash
scripts/.venv/bin/python scripts/generate_sql.py
# → scripts/output/import_menus.sql
```

Paste the contents of `import_menus.sql` into the **Supabase SQL editor**:
https://supabase.com/dashboard/project/yjbrzyjdapvfaknjltxm/sql/new

The final `SELECT COUNT(*)` at the end confirms how many default menus exist after the import.

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
