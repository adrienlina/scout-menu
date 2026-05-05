# Agribalyse Carbon Footprint Linkage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Agribalyse carbon footprint data to the default dish import pipeline — seed the `agribalyse_foods` table from the ADEME CSV, match each ingredient to an Agribalyse food via Claude Haiku, and regenerate the import SQL with `agribalyse_food_id` + `unit_multiplier` filled in.

**Architecture:** Three pipeline scripts — `seed_agribalyse.py` (CSV → SQL), `match_agribalyse.py` (ingredients → Agribalyse map via batched Haiku calls with prompt caching), updated `generate_sql.py` (adds DELETE + Agribalyse linkage columns). The unit_multiplier lookup uses a two-tier strategy: per-food ILIKE patterns from `scripts/data/agribalyse_default_ratios.csv`, falling back to `g→1 / kg→1000 / else→1000`.

**Tech Stack:** Python 3.12, `anthropic` SDK, `pytest` (new), stdlib `csv`/`json`/`re`/`urllib.request`. All scripts run in `scripts/.venv`.

---

## File Map

| Path | Status | Responsibility |
|------|--------|----------------|
| `scripts/seed_agribalyse.py` | Create | Download Agribalyse CSV, map columns, generate `seed_agribalyse.sql` |
| `scripts/match_agribalyse.py` | Create | Batch-match ingredient names → Agribalyse names via Haiku |
| `scripts/generate_sql.py` | Modify | Add DELETE header, load agribalyse map, include `agribalyse_food_id` + `unit_multiplier` in ingredient INSERTs |
| `scripts/data/agribalyse_default_ratios.csv` | Exists | 163-row ILIKE pattern → grams_per_unit lookup table |
| `scripts/tests/test_seed_agribalyse.py` | Create | Tests for CSV parsing and SQL generation logic |
| `scripts/tests/test_match_agribalyse.py` | Create | Tests for batch response parsing |
| `scripts/tests/test_generate_sql.py` | Create | Tests for ILIKE matching and unit_multiplier lookup |
| `scripts/output/seed_agribalyse_1.sql` | Generate | First Agribalyse seed batch |
| `scripts/output/import_menus_2.sql` | Generate | Dishes re-imported with Agribalyse linkage |
| `.claude/skills/import-camp-menus/SKILL.md` | Modify | Add steps 2.5 and 3.5, update batch table |

---

## Task 1: `scripts/seed_agribalyse.py`

**Files:**
- Create: `scripts/seed_agribalyse.py`
- Create: `scripts/tests/test_seed_agribalyse.py`

The Agribalyse 3.2 Synthèse CSV must be downloaded from ADEME and placed at `scripts/data/agribalyse_synth.csv`. Download page: https://agribalyse.ademe.fr/app/downloads — look for "AGRIBALYSE®3.2 - Synthèse". The file is semicolon-separated with comment/metadata rows at the top; the header row starts with `"Code CIQUAL"` or `"Ciqual AGB"`.

- [ ] **Step 1.1: Install pytest in the venv**

```bash
cd /path/to/scout-menu
scripts/.venv/bin/pip install pytest
```

Expected: `Successfully installed pytest-...`

- [ ] **Step 1.2: Write failing tests for pure functions**

Create `scripts/tests/__init__.py` (empty) and `scripts/tests/test_seed_agribalyse.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from seed_agribalyse import parse_agribalyse_csv, build_insert_sql, find_col

SAMPLE_CSV = """\
# comment
Code CIQUAL;Nom du Produit en Français;Groupe d'aliment;Sous-groupe d'aliment;DQR;Score unique EF (mPt/kg de produit);Changement climatique (kg CO2 eq/kg de produit);Acidification terrestre et eaux douces (mol H+ eq/kg de produit);Eutrophisation eaux douces (E-03 kg P eq/kg de produit);Eutrophisation marine (E-03 kg N eq/kg de produit);Eutrophisation terrestre (mol N eq/kg de produit);Appauvrissement de la couche d ozone (E-06 kg CVC11 eq/kg de produit);Rayonnements ionisants (kBq U-235 eq/kg de produit);Formation photochimique d ozone (E-03 kg NMVOC eq/kg de produit);Particules (E-06 disease inc./kg de produit);Écotoxicité pour écosystèmes aquatiques d eau douce (CTUe/kg de produit);Utilisation du sol (Pt/kg de produit);Épuisement des ressources eau (m3 depriv./kg de produit);Épuisement des ressources énergétiques (MJ/kg de produit);Épuisement des ressources minéraux (E-06 kg Sb eq/kg de produit);Changement climatique - émissions biogéniques (kg CO2 eq/kg de produit);Changement climatique - émissions fossiles (kg CO2 eq/kg de produit);Changement climatique - émissions liées au changement d affectation des sols (kg CO2 eq/kg de produit);Toxicité humaine - effets cancérogènes (CTUh/kg de produit);Toxicité humaine - effets non cancérogènes (CTUh/kg de produit);Agriculture biologique;Système de production
20001;Farine de blé T55;Céréales et produits dérivés;Farines;1.5;0.65;0.55;0.002;0.0001;0.0002;0.003;0.00001;0.01;0.002;0.00001;0.5;0.1;0.05;5.0;0.0001;0.01;0.53;0.01;0.000001;0.000005;Non;Conventionnel
20002;Huile d olive vierge extra;Corps gras;Huiles;2.0;3.2;4.1;0.005;0.0002;0.001;0.01;0.00002;0.02;0.003;0.00002;1.0;0.5;0.1;10.0;0.0002;0.05;4.0;0.05;0.000002;0.00001;Non;Conventionnel
"""

def test_find_col_exact():
    headers = ["Code CIQUAL", "Nom du Produit en Français", "Changement climatique (kg CO2 eq/kg de produit)"]
    assert find_col(headers, "Changement climatique") == 2

def test_find_col_missing():
    headers = ["Code CIQUAL", "Nom du Produit en Français"]
    assert find_col(headers, "Changement climatique") is None

def test_parse_agribalyse_csv_count(tmp_path):
    f = tmp_path / "synth.csv"
    f.write_text(SAMPLE_CSV, encoding="utf-8")
    rows = parse_agribalyse_csv(str(f))
    assert len(rows) == 2

def test_parse_agribalyse_csv_fields(tmp_path):
    f = tmp_path / "synth.csv"
    f.write_text(SAMPLE_CSV, encoding="utf-8")
    rows = parse_agribalyse_csv(str(f))
    r = rows[0]
    assert r["name"] == "Farine de blé T55"
    assert abs(r["changement_climatique"] - 0.55) < 1e-6
    assert r["is_bio"] is False
    assert r["production_type"] == "Conventionnel"
    # id is a UUID string
    assert len(r["id"]) == 36

def test_parse_agribalyse_csv_skips_comments(tmp_path):
    csv_with_comments = "# this is a comment\n" + SAMPLE_CSV
    f = tmp_path / "synth.csv"
    f.write_text(csv_with_comments, encoding="utf-8")
    rows = parse_agribalyse_csv(str(f))
    assert len(rows) == 2

def test_build_insert_sql_structure(tmp_path):
    rows = [{"id": "11111111-1111-1111-1111-111111111111", "name": "Pain", "changement_climatique": 1.2,
             "score_unique_ef": 0.5, "acidification": None, "cc_biogenique": None, "cc_fossile": None,
             "cc_affectation_sols": None, "ecotoxicite_eau_douce": None, "epuisement_eau": None,
             "epuisement_energie": None, "epuisement_mineraux": None, "eutrophisation_eaux_douces": None,
             "eutrophisation_marine": None, "eutrophisation_terrestre": None, "formation_ozone": None,
             "ozone": None, "particules": None, "rayonnements_ionisants": None, "toxicite_cancerogene": None,
             "toxicite_non_cancerogene": None, "utilisation_sol": None, "is_bio": False, "production_type": "Conventionnel"}]
    sql = build_insert_sql(rows)
    assert "INSERT INTO public.agribalyse_foods" in sql
    assert "11111111-1111-1111-1111-111111111111" in sql
    assert "Pain" in sql
    assert "ON CONFLICT (id) DO NOTHING" in sql
```

- [ ] **Step 1.3: Run tests to verify they fail**

```bash
cd /path/to/scout-menu
scripts/.venv/bin/python -m pytest scripts/tests/test_seed_agribalyse.py -v 2>&1 | head -30
```

Expected: `ModuleNotFoundError: No module named 'seed_agribalyse'` — confirms the tests are wired.

- [ ] **Step 1.4: Implement `scripts/seed_agribalyse.py`**

```python
#!/usr/bin/env python3
"""Seed the agribalyse_foods table from the AGRIBALYSE 3.2 Synthèse CSV.

Download the CSV from: https://agribalyse.ademe.fr/app/downloads
Save as: scripts/data/agribalyse_synth.csv

Usage:
    python3 scripts/seed_agribalyse.py [path/to/agribalyse_synth.csv]
"""

import csv
import json
import os
import sys
import uuid

IN_FILE = "scripts/data/agribalyse_synth.csv"
OUT_FILE = "scripts/output/seed_agribalyse.sql"

# Maps substrings in CSV column headers → DB column names
IMPACT_COLS = {
    "Changement climatique (kg CO2 eq": "changement_climatique",
    "Score unique EF": "score_unique_ef",
    "Acidification": "acidification",
    "Eutrophisation eaux douces": "eutrophisation_eaux_douces",
    "Eutrophisation marine": "eutrophisation_marine",
    "Eutrophisation terrestre": "eutrophisation_terrestre",
    "Appauvrissement de la couche": "ozone",
    "Rayonnements ionisants": "rayonnements_ionisants",
    "Formation photochimique": "formation_ozone",
    "Particules": "particules",
    "cotoxicit": "ecotoxicite_eau_douce",
    "Utilisation du sol": "utilisation_sol",
    "puisement des ressources eau": "epuisement_eau",
    "puisement des ressources nerg": "epuisement_energie",
    "puisement des ressources min": "epuisement_mineraux",
    "missions biog": "cc_biogenique",
    "missions fossiles": "cc_fossile",
    "affectation des sols": "cc_affectation_sols",
    "canc": "toxicite_cancerogene",
    "non canc": "toxicite_non_cancerogene",
}

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuid.NAMESPACE_URL


def find_col(headers: list[str], substring: str) -> int | None:
    for i, h in enumerate(headers):
        if substring.lower() in h.lower():
            return i
    return None


def _float_or_none(s: str) -> float | None:
    s = s.strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_agribalyse_csv(path: str) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8-sig") as fh:
        reader = csv.reader(fh, delimiter=";")
        headers = None
        for line in reader:
            if not line or line[0].startswith("#"):
                continue
            # Find the header row: must contain "Nom du Produit"
            if headers is None:
                joined = ";".join(line)
                if "Nom du Produit" in joined or "nom du produit" in joined.lower():
                    headers = line
                continue

            if len(line) < 3:
                continue

            # Code is first column; name is the column containing "Nom du Produit"
            name_idx = find_col(headers, "Nom du Produit") or 1
            code = line[0].strip()
            name = line[name_idx].strip()
            if not name:
                continue

            row_id = str(uuid.uuid5(_NS, f"agribalyse:{code}"))

            record: dict = {
                "id": row_id,
                "name": name,
                "is_bio": False,
                "production_type": None,
            }

            # Map impact columns
            for db_col in [
                "changement_climatique", "score_unique_ef", "acidification",
                "cc_biogenique", "cc_fossile", "cc_affectation_sols",
                "ecotoxicite_eau_douce", "epuisement_eau", "epuisement_energie",
                "epuisement_mineraux", "eutrophisation_eaux_douces",
                "eutrophisation_marine", "eutrophisation_terrestre",
                "formation_ozone", "ozone", "particules", "rayonnements_ionisants",
                "toxicite_cancerogene", "toxicite_non_cancerogene", "utilisation_sol",
            ]:
                record[db_col] = None

            for csv_substr, db_col in IMPACT_COLS.items():
                idx = find_col(headers, csv_substr)
                if idx is not None and idx < len(line):
                    record[db_col] = _float_or_none(line[idx])

            # is_bio
            bio_idx = find_col(headers, "Agriculture biologique")
            if bio_idx is not None and bio_idx < len(line):
                record["is_bio"] = line[bio_idx].strip().lower() in ("oui", "yes", "true", "1")

            # production_type
            prod_idx = find_col(headers, "Système de production")
            if prod_idx is not None and prod_idx < len(line):
                record["production_type"] = line[prod_idx].strip() or None

            rows.append(record)
    return rows


def _sql_val(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def build_insert_sql(rows: list[dict]) -> str:
    cols = [
        "id", "name", "changement_climatique", "score_unique_ef", "acidification",
        "cc_biogenique", "cc_fossile", "cc_affectation_sols", "ecotoxicite_eau_douce",
        "epuisement_eau", "epuisement_energie", "epuisement_mineraux",
        "eutrophisation_eaux_douces", "eutrophisation_marine", "eutrophisation_terrestre",
        "formation_ozone", "ozone", "particules", "rayonnements_ionisants",
        "toxicite_cancerogene", "toxicite_non_cancerogene", "utilisation_sol",
        "is_bio", "production_type",
    ]
    col_list = ", ".join(cols)
    lines = [
        "-- Scout-menu: seed agribalyse_foods from AGRIBALYSE 3.2 Synthèse",
        "-- Generated by scripts/seed_agribalyse.py",
        "-- Run once in Supabase SQL editor (Dashboard → SQL Editor → New query)",
        "",
    ]
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        lines.append(f"INSERT INTO public.agribalyse_foods ({col_list}) VALUES")
        value_rows = []
        for r in batch:
            vals = ", ".join(_sql_val(r.get(c)) for c in cols)
            value_rows.append(f"  ({vals})")
        lines.append(",\n".join(value_rows))
        lines.append("ON CONFLICT (id) DO NOTHING;")
        lines.append("")
    lines.append(f"SELECT COUNT(*) AS total_agribalyse_foods FROM public.agribalyse_foods;")
    return "\n".join(lines)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else IN_FILE
    if not os.path.exists(path):
        print(f"Error: {path} not found.", file=sys.stderr)
        print("Download from: https://agribalyse.ademe.fr/app/downloads", file=sys.stderr)
        print("Save as: scripts/data/agribalyse_synth.csv", file=sys.stderr)
        sys.exit(1)

    print(f"Parsing {path}...")
    rows = parse_agribalyse_csv(path)
    print(f"Parsed {len(rows)} rows.")

    os.makedirs("scripts/output", exist_ok=True)
    sql = build_insert_sql(rows)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"Done → {OUT_FILE} ({len(sql):,} bytes, {len(rows)} foods)")
    print(f"Paste into: https://supabase.com/dashboard/project/yjbrzyjdapvfaknjltxm/sql/new")


if __name__ == "__main__":
    main()
```

- [ ] **Step 1.5: Run tests to verify they pass**

```bash
cd /path/to/scout-menu
scripts/.venv/bin/python -m pytest scripts/tests/test_seed_agribalyse.py -v
```

Expected: all 6 tests PASS.

- [ ] **Step 1.6: Commit**

```bash
git add scripts/seed_agribalyse.py scripts/tests/__init__.py scripts/tests/test_seed_agribalyse.py
git commit -m "Add seed_agribalyse.py with tests"
```

---

## Task 2: `scripts/match_agribalyse.py`

**Files:**
- Create: `scripts/match_agribalyse.py`
- Create: `scripts/tests/test_match_agribalyse.py`

Uses batched Claude Haiku calls (20 ingredients per call) with prompt caching on the system prompt (which contains the full ~2600-name Agribalyse list). This reduces API calls from ~400 to ~21.

- [ ] **Step 2.1: Write failing tests**

Create `scripts/tests/test_match_agribalyse.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from match_agribalyse import build_batches, parse_batch_response, ilike_match

# --- ilike_match ---

def test_ilike_match_simple():
    assert ilike_match("%farine%", "Farine de blé T55") is True

def test_ilike_match_multi_segment():
    assert ilike_match("%ail%gousse%", "Ail, gousse, cru") is True

def test_ilike_match_no_match():
    assert ilike_match("%tomate%", "Farine de blé T55") is False

def test_ilike_match_case_insensitive():
    assert ilike_match("%FARINE%", "farine de blé") is True

# --- build_batches ---

def test_build_batches_splits_correctly():
    items = list(range(45))
    batches = build_batches(items, batch_size=20)
    assert len(batches) == 3
    assert len(batches[0]) == 20
    assert len(batches[1]) == 20
    assert len(batches[2]) == 5

def test_build_batches_single():
    items = ["sel"]
    batches = build_batches(items, batch_size=20)
    assert batches == [["sel"]]

# --- parse_batch_response ---

def test_parse_batch_response_valid():
    response_text = '{"farine de blé": "Farine de blé T55", "sel": null, "huile": "Huile d\'olive"}'
    batch = ["farine de blé", "sel", "huile"]
    result = parse_batch_response(response_text, batch)
    assert result["farine de blé"] == "Farine de blé T55"
    assert result["sel"] is None
    assert result["huile"] == "Huile d'olive"

def test_parse_batch_response_strips_fences():
    response_text = '```json\n{"sel": null}\n```'
    result = parse_batch_response(response_text, ["sel"])
    assert result["sel"] is None

def test_parse_batch_response_missing_keys_default_none():
    response_text = '{"farine": "Farine T55"}'
    batch = ["farine", "sel"]
    result = parse_batch_response(response_text, batch)
    assert result.get("sel") is None
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
scripts/.venv/bin/python -m pytest scripts/tests/test_match_agribalyse.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'match_agribalyse'`

- [ ] **Step 2.3: Implement `scripts/match_agribalyse.py`**

```python
#!/usr/bin/env python3
"""Match ingredient names to Agribalyse food names using Claude Haiku.

Reads:  scripts/output/dishes_with_ingredients.json
        scripts/data/agribalyse_synth.csv  (for the food name list)
Writes: scripts/output/ingredient_agribalyse_map.json

Usage:
    python3 scripts/match_agribalyse.py
"""

import csv
import json
import os
import re
import sys
import anthropic

DISHES_FILE = "scripts/output/dishes_with_ingredients.json"
CSV_FILE = "scripts/data/agribalyse_synth.csv"
OUT_FILE = "scripts/output/ingredient_agribalyse_map.json"
BATCH_SIZE = 20


def ilike_match(pattern: str, text: str) -> bool:
    """Python equivalent of SQL ILIKE with % wildcards."""
    regex = ".*".join(re.escape(seg) for seg in pattern.lower().split("%") if seg)
    return bool(re.fullmatch(f".*{regex}.*", text.lower()))


def build_batches(items: list, batch_size: int) -> list[list]:
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


def parse_batch_response(text: str, batch: list[str]) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
    return {ing: data.get(ing) for ing in batch}


def load_agribalyse_names(csv_path: str) -> list[str]:
    names = []
    with open(csv_path, encoding="utf-8-sig") as fh:
        reader = csv.reader(fh, delimiter=";")
        headers = None
        for line in reader:
            if not line or line[0].startswith("#"):
                continue
            joined = ";".join(line)
            if headers is None:
                if "Nom du Produit" in joined or "nom du produit" in joined.lower():
                    headers = line
                continue
            name_idx = next((i for i, h in enumerate(headers) if "Nom du Produit" in h), 1)
            name = line[name_idx].strip() if name_idx < len(line) else ""
            if name:
                names.append(name)
    return names


def build_system_prompt(agribalyse_names: list[str]) -> str:
    names_list = "\n".join(agribalyse_names)
    return f"""Tu es un assistant expert en alimentation française et en base de données Agribalyse.

Voici la liste complète des produits Agribalyse disponibles (un par ligne):
{names_list}

Ta tâche: pour chaque ingrédient donné, retourne le nom Agribalyse correspondant le mieux.
Règles:
- Retourne null si aucun produit ne correspond raisonnablement
- Préfère les produits "cru" aux produits préparés, sauf si l'ingrédient indique une préparation
- Retourne le nom EXACTEMENT tel qu'il apparaît dans la liste ci-dessus
- Réponds UNIQUEMENT avec un objet JSON: {{"ingredient": "nom agribalyse ou null"}}"""


def match_batch(client: anthropic.Anthropic, system_prompt: str, batch: list[str]) -> dict:
    user_msg = json.dumps(batch, ensure_ascii=False)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": f"Ingrédients: {user_msg}"}],
    )
    return parse_batch_response(response.content[0].text, batch)


def main():
    if not os.path.exists(DISHES_FILE):
        print(f"Error: {DISHES_FILE} not found.", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.", file=sys.stderr)
        print("Download Agribalyse 3.2 Synthèse CSV and save as scripts/data/agribalyse_synth.csv", file=sys.stderr)
        sys.exit(1)

    dishes = json.load(open(DISHES_FILE, encoding="utf-8"))
    unique_ingredients = sorted({
        ing["name"]
        for dish in dishes
        for ing in dish.get("ingredients", [])
    })
    print(f"Matching {len(unique_ingredients)} unique ingredients...")

    agribalyse_names = load_agribalyse_names(CSV_FILE)
    print(f"Loaded {len(agribalyse_names)} Agribalyse food names from CSV.")

    system_prompt = build_system_prompt(agribalyse_names)
    client = anthropic.Anthropic()

    result: dict = {}
    batches = build_batches(unique_ingredients, BATCH_SIZE)
    for i, batch in enumerate(batches, 1):
        print(f"[{i}/{len(batches)}] Matching batch of {len(batch)}...")
        try:
            matched = match_batch(client, system_prompt, batch)
            result.update(matched)
            matched_count = sum(1 for v in matched.values() if v)
            print(f"  → {matched_count}/{len(batch)} matched")
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)
            result.update({ing: None for ing in batch})

    os.makedirs("scripts/output", exist_ok=True)
    json.dump(result, open(OUT_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    total_matched = sum(1 for v in result.values() if v)
    print(f"\nDone. {total_matched}/{len(unique_ingredients)} ingredients matched → {OUT_FILE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
scripts/.venv/bin/python -m pytest scripts/tests/test_match_agribalyse.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add scripts/match_agribalyse.py scripts/tests/test_match_agribalyse.py
git commit -m "Add match_agribalyse.py with batched Haiku matching and tests"
```

---

## Task 3: Update `scripts/generate_sql.py`

**Files:**
- Modify: `scripts/generate_sql.py`
- Create: `scripts/tests/test_generate_sql.py`

Adds: DELETE header, loading of `ingredient_agribalyse_map.json`, two-tier `unit_multiplier` lookup, updated ingredient INSERT columns.

- [ ] **Step 3.1: Write failing tests**

Create `scripts/tests/test_generate_sql.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from generate_sql import get_fallback_ratio, load_ratio_rows, get_unit_multiplier

RATIO_CSV_CONTENT = """\
name_pattern;unit;grams_per_unit;note
# comment line
%ail%gousse%;pièce;5;Gousse d'ail
%oeuf%;pièce;60;Oeuf entier
%huile%;ml;0.92;Densité huile
%lait%;ml;1.03;Densité lait
"""

# --- get_fallback_ratio ---

def test_fallback_g():
    assert get_fallback_ratio("g") == 1.0

def test_fallback_kg():
    assert get_fallback_ratio("kg") == 1000.0

def test_fallback_other():
    assert get_fallback_ratio("pièce") == 1000.0
    assert get_fallback_ratio("ml") == 1000.0
    assert get_fallback_ratio("pincée") == 1000.0

# --- load_ratio_rows ---

def test_load_ratio_rows_skips_comments(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    assert len(rows) == 4
    assert all(r["name_pattern"] for r in rows)

def test_load_ratio_rows_fields(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    assert rows[0] == {"name_pattern": "%ail%gousse%", "unit": "pièce", "grams_per_unit": 5.0}

# --- get_unit_multiplier ---

def test_unit_multiplier_ilike_hit(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    # "Ail, cru" matches "%ail%gousse%" → NO, but let's use a name that matches
    assert get_unit_multiplier("Œuf de poule, entier, cru", "pièce", rows) == 60.0

def test_unit_multiplier_ilike_miss_uses_fallback(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    # No pattern matches "Sel" + "pièce"
    assert get_unit_multiplier("Sel fin", "pièce", rows) == 1000.0

def test_unit_multiplier_g_no_lookup_needed(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    assert get_unit_multiplier("Farine de blé T55", "g", rows) == 1.0

def test_unit_multiplier_ml_with_match(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
    assert get_unit_multiplier("Huile de tournesol", "ml", rows) == 0.92
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
scripts/.venv/bin/python -m pytest scripts/tests/test_generate_sql.py -v 2>&1 | head -20
```

Expected: `ImportError: cannot import name 'get_fallback_ratio' from 'generate_sql'`

- [ ] **Step 3.3: Update `scripts/generate_sql.py`**

Replace the entire file with:

```python
#!/usr/bin/env python3
"""Generate a SQL script to insert dishes into Supabase.

Reads scripts/output/dishes_with_ingredients.json and produces
scripts/output/import_menus.sql — paste it into the Supabase SQL editor.

If scripts/output/ingredient_agribalyse_map.json exists, each ingredient
INSERT will include agribalyse_food_id and unit_multiplier.

Usage:
    python3 scripts/generate_sql.py
"""

import csv
import json
import os
import re

IN_FILE = "scripts/output/dishes_with_ingredients.json"
AGRIBALYSE_MAP_FILE = "scripts/output/ingredient_agribalyse_map.json"
RATIO_CSV_FILE = "scripts/data/agribalyse_default_ratios.csv"
OUT_FILE = "scripts/output/import_menus.sql"

MEAL_TYPE_PRIORITY = ["diner", "dejeuner", "petit-dejeuner", "gouter"]


def esc(s: str) -> str:
    return s.replace("'", "''")


def get_fallback_ratio(unit: str) -> float:
    if unit == "g":
        return 1.0
    if unit == "kg":
        return 1000.0
    return 1000.0


def load_ratio_rows(path: str) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=";")
        headers_seen = False
        for line in reader:
            if not line:
                continue
            raw = line[0].strip()
            if raw.startswith("#") or raw == "name_pattern":
                if raw == "name_pattern":
                    headers_seen = True
                continue
            if len(line) < 3:
                continue
            try:
                grams = float(line[2].strip())
            except ValueError:
                continue
            rows.append({
                "name_pattern": line[0].strip(),
                "unit": line[1].strip(),
                "grams_per_unit": grams,
            })
    return rows


def _ilike_match(pattern: str, text: str) -> bool:
    regex = ".*".join(re.escape(seg) for seg in pattern.lower().split("%") if seg)
    return bool(re.fullmatch(f".*{regex}.*", text.lower())) if regex else True


def get_unit_multiplier(agribalyse_name: str | None, unit: str, ratio_rows: list[dict]) -> float:
    if agribalyse_name and unit not in ("g", "kg"):
        for row in ratio_rows:
            if row["unit"] == unit and _ilike_match(row["name_pattern"], agribalyse_name):
                return row["grams_per_unit"]
    return get_fallback_ratio(unit)


def main():
    dishes = json.load(open(IN_FILE, encoding="utf-8"))
    to_import = [d for d in dishes if not d.get("error") or d.get("ingredients")]
    print(f"Generating SQL for {len(to_import)} dishes...")

    agribalyse_map: dict = {}
    if os.path.exists(AGRIBALYSE_MAP_FILE):
        agribalyse_map = json.load(open(AGRIBALYSE_MAP_FILE, encoding="utf-8"))
        print(f"Loaded Agribalyse map: {sum(1 for v in agribalyse_map.values() if v)} matches")

    ratio_rows: list[dict] = []
    if os.path.exists(RATIO_CSV_FILE):
        ratio_rows = load_ratio_rows(RATIO_CSV_FILE)

    lines = [
        "-- Scout-menu: import default dishes from SGDF camp menus",
        "-- Generated by scripts/generate_sql.py",
        "-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)",
        "",
        "-- Clear existing default dishes (re-imported with Agribalyse linkage below)",
        "DELETE FROM public.menus WHERE is_default = true AND user_id IS NULL;",
        "",
        "DO $$",
        "DECLARE",
        "  v_menu_id UUID;",
        "BEGIN",
        "",
    ]

    for dish in to_import:
        name = dish["name"]
        ingredients = dish.get("ingredients", [])
        meal_types = dish.get("meal_types", [])
        meal_type = next((t for t in MEAL_TYPE_PRIORITY if t in meal_types), meal_types[0] if meal_types else "diner")

        lines.append(f"  -- {name}")
        lines.append(f"  INSERT INTO public.menus (name, meal_type, is_default, user_id)")
        lines.append(f"  VALUES ('{esc(name)}', '{meal_type}', true, NULL)")
        lines.append(f"  RETURNING id INTO v_menu_id;")

        if ingredients:
            for ing in ingredients:
                ing_name = ing["name"]
                qty = ing["quantity"]
                unit = ing["unit"]
                agribalyse_name = agribalyse_map.get(ing_name)
                multiplier = get_unit_multiplier(agribalyse_name, unit, ratio_rows)

                if agribalyse_name:
                    agri_subquery = f"(SELECT id FROM agribalyse_foods WHERE name = '{esc(agribalyse_name)}' LIMIT 1)"
                else:
                    agri_subquery = "NULL"

                lines.append(
                    f"  INSERT INTO public.menu_ingredients "
                    f"(menu_id, name, quantity, unit, agribalyse_food_id, unit_multiplier)"
                )
                lines.append(
                    f"  VALUES (v_menu_id, '{esc(ing_name)}', {qty}, '{esc(unit)}', "
                    f"{agri_subquery}, {multiplier});"
                )

        lines.append("")

    lines += [
        "END $$;",
        "",
        "SELECT COUNT(*) AS total_default_menus FROM public.menus WHERE is_default = true;",
    ]

    sql = "\n".join(lines)
    os.makedirs("scripts/output", exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"Done → {OUT_FILE} ({len(sql):,} bytes)")
    print(f"Paste into: https://supabase.com/dashboard/project/yjbrzyjdapvfaknjltxm/sql/new")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
scripts/.venv/bin/python -m pytest scripts/tests/ -v
```

Expected: all tests PASS across all three test files (6 + 8 + 9 = 23 tests).

- [ ] **Step 3.5: Commit**

```bash
git add scripts/generate_sql.py scripts/tests/test_generate_sql.py
git commit -m "Update generate_sql.py: DELETE header, Agribalyse linkage, unit_multiplier lookup"
```

---

## Task 4: Run Pipeline and Update Skill

- [ ] **Step 4.1: Download Agribalyse CSV**

Download the "AGRIBALYSE®3.2 - Synthèse" CSV from https://agribalyse.ademe.fr/app/downloads and save it as `scripts/data/agribalyse_synth.csv`.

- [ ] **Step 4.2: Run `seed_agribalyse.py`**

```bash
cd /path/to/scout-menu
scripts/.venv/bin/python scripts/seed_agribalyse.py
```

Expected output:
```
Parsing scripts/data/agribalyse_synth.csv...
Parsed ~2600 rows.
Done → scripts/output/seed_agribalyse.sql (... bytes, ~2600 foods)
```

- [ ] **Step 4.3: Version the Agribalyse seed file**

```bash
cp scripts/output/seed_agribalyse.sql scripts/output/seed_agribalyse_1.sql
```

- [ ] **Step 4.4: Run `match_agribalyse.py`**

```bash
scripts/.venv/bin/python scripts/match_agribalyse.py
```

Expected: ~21 batches, output line `Done. XXX/402 ingredients matched`. Most ingredients should match (target > 300/402).

- [ ] **Step 4.5: Run `generate_sql.py`**

```bash
scripts/.venv/bin/python scripts/generate_sql.py
```

Expected: outputs `import_menus.sql`. Spot-check a few ingredient lines — they should contain `agribalyse_food_id` subquery and `unit_multiplier` values.

```bash
grep "agribalyse_food_id" scripts/output/import_menus.sql | head -5
grep "unit_multiplier" scripts/output/import_menus.sql | head -5
```

- [ ] **Step 4.6: Version the menus import file**

```bash
cp scripts/output/import_menus.sql scripts/output/import_menus_2.sql
```

- [ ] **Step 4.7: Update SKILL.md**

Edit `.claude/skills/import-camp-menus/SKILL.md`:

1. Add **Step 2.5** after the existing Step 2 (Parse HTML):

```markdown
### 2.5. Seed Agribalyse foods (run once)
Download AGRIBALYSE®3.2 Synthèse CSV from https://agribalyse.ademe.fr/app/downloads
Save as `scripts/data/agribalyse_synth.csv`, then:

```bash
scripts/.venv/bin/python scripts/seed_agribalyse.py
# → scripts/output/seed_agribalyse.sql
```
Name with incrementing suffix before committing (e.g. `seed_agribalyse_1.sql`).
Paste into the Supabase SQL editor. Idempotent via `ON CONFLICT (id) DO NOTHING`.
```

2. Add **Step 3.5** between existing Steps 3 and 4:

```markdown
### 3.5. Match ingredients to Agribalyse foods

```bash
scripts/.venv/bin/python scripts/match_agribalyse.py
```
Output: `scripts/output/ingredient_agribalyse_map.json`
```

3. Update the "Previously imported batches" table:

```markdown
| File | Dishes | Agribalyse | Date |
|------|--------|------------|------|
| `scripts/output/import_menus_1.sql` | 165 | No | 2026-04-30 |
| `scripts/output/import_menus_2.sql` | 165 | Yes | 2026-04-30 |
```

4. Add a "Seeded Agribalyse batches" table:

```markdown
### Seeded Agribalyse batches

| File | Foods | Date |
|------|-------|------|
| `scripts/output/seed_agribalyse_1.sql` | ~2600 | 2026-04-30 |
```

- [ ] **Step 4.8: Commit everything**

```bash
git add scripts/output/seed_agribalyse_1.sql \
        scripts/output/import_menus_2.sql \
        scripts/output/ingredient_agribalyse_map.json \
        .claude/skills/import-camp-menus/SKILL.md
git commit -m "Run Agribalyse linkage pipeline: seed + match + import_menus_2 with CO2 data"
```

---

## Self-Review

**Spec coverage:**
- ✅ `seed_agribalyse.py` — all rows (CIQUAL + GINCO), `ON CONFLICT DO NOTHING`
- ✅ `match_agribalyse.py` — batched Haiku, saves `ingredient_agribalyse_map.json`
- ✅ `generate_sql.py` — DELETE header, `agribalyse_food_id` subquery, `unit_multiplier`
- ✅ Unit multiplier two-tier: ILIKE CSV lookup → fallback `g/kg/else`
- ✅ SQL versioning: `seed_agribalyse_1.sql` + `import_menus_2.sql`
- ✅ SKILL.md updated with steps 2.5 and 3.5

**Placeholder check:** No TBDs. All code blocks are complete and self-contained.

**Type consistency:**
- `load_ratio_rows` returns `list[dict]` with keys `name_pattern`, `unit`, `grams_per_unit` — used consistently in `get_unit_multiplier` and tests.
- `parse_batch_response` takes `(text: str, batch: list[str])` — matches `match_batch` call and tests.
- `ilike_match` in `match_agribalyse.py` and `_ilike_match` in `generate_sql.py` are separate implementations — same logic, private in `generate_sql.py` to avoid circular imports. Tests import from `match_agribalyse` for the public function.
