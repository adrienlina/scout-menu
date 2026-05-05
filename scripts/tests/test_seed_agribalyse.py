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
    assert len(r["id"]) == 36
    from seed_agribalyse import IMPACT_COLS
    for db_col in set(IMPACT_COLS.values()):
        assert r[db_col] is not None, f"Expected non-NULL for {db_col}"

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
