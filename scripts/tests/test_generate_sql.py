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
    assert get_unit_multiplier("Œuf de poule, entier, cru", "pièce", rows) == 60.0

def test_unit_multiplier_ilike_miss_uses_fallback(tmp_path):
    f = tmp_path / "ratios.csv"
    f.write_text(RATIO_CSV_CONTENT, encoding="utf-8")
    rows = load_ratio_rows(str(f))
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
