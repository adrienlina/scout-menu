#!/usr/bin/env python3
"""Seed the agribalyse_foods table from the AGRIBALYSE 3.2 Synthèse CSV.

Download the CSV from: https://agribalyse.ademe.fr/app/downloads
Save as: scripts/data/agribalyse_synth.csv

Usage:
    python3 scripts/seed_agribalyse.py [path/to/agribalyse_synth.csv]
"""

import csv
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
    "nergétiques": "epuisement_energie",
    "puisement des ressources min": "epuisement_mineraux",
    "missions biog": "cc_biogenique",
    "missions fossiles": "cc_fossile",
    "affectation des sols": "cc_affectation_sols",
    "canc": "toxicite_cancerogene",
    "non canc": "toxicite_non_cancerogene",
}

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuid.NAMESPACE_URL


def find_col(headers: list, substring: str):
    for i, h in enumerate(headers):
        if substring.lower() in h.lower():
            return i
    return None


def _float_or_none(s: str):
    s = s.strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_agribalyse_csv(path: str) -> list:
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

            _idx = find_col(headers, "Nom du Produit")
            name_idx = _idx if _idx is not None else 1
            code = line[0].strip()
            name = line[name_idx].strip()
            if not name:
                continue

            row_id = str(uuid.uuid5(_NS, f"agribalyse:{code}"))

            record = {
                "id": row_id,
                "name": name,
                "is_bio": False,
                "production_type": None,
            }

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

            bio_idx = find_col(headers, "Agriculture biologique")
            if bio_idx is not None and bio_idx < len(line):
                record["is_bio"] = line[bio_idx].strip().lower() in ("oui", "yes", "true", "1")

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


def build_insert_sql(rows: list) -> str:
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
    lines.append("SELECT COUNT(*) AS total_agribalyse_foods FROM public.agribalyse_foods;")
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
