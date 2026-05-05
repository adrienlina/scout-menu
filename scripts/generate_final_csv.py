#!/usr/bin/env python3
"""Produce dishes_final.csv from dishes_reviewed.csv.

- Fills missing agribalyse_match values via Claude Haiku
- Fixes known wrong from-scratch matches (e.g. chips → raw potato)
- Re-adds dishes deleted by reviewer that should be simplified to a single bought ingredient
- Recomputes unit_multiplier for every row

Usage:
    python3 scripts/generate_final_csv.py
"""

import csv
import os
import sys

import anthropic

sys.path.insert(0, os.path.dirname(__file__))
from generate_sql import (
    RATIO_CSV_FILE,
    get_unit_multiplier,
    load_ratio_rows,
)
from match_agribalyse import (
    XLSX_FILE,
    _load_names_xlsx,
    build_batches,
    build_system_prompt,
    match_batch,
)

IN_FILE = "scripts/output/dishes_reviewed.csv"
OUT_FILE = "scripts/output/dishes_final.csv"
CSV_FILE = "scripts/data/agribalyse_synth.csv"
BATCH_SIZE = 20

# Known wrong from-scratch matches: ingredient_name (lower) → correct agribalyse name
WRONG_MATCHES = {
    "chips": "Chips de pommes de terre, standard",
}

# Manual matches that Claude can't find (closest Agribalyse proxy)
MANUAL_MATCHES = {
    "mirabelles fraiches": "Prune, crue",  # mirabelle is a variety of plum
}

# Dishes deleted by reviewer because their "from scratch" ingredients are wrong.
# Re-added here as a single bought ingredient. qty is per person.
# Dishes that are pure duplicates of other kept dishes (banane=bananes, etc.) are excluded.
READYMADE_DISHES = [
    # --- Dairy desserts ---
    {"dish_name": "yaourt",                    "meal_types": "dejeuner",               "ingredient_name": "yaourt nature",                    "quantity": 125, "unit": "g",     "agribalyse_match": "Yaourt, lait fermenté ou spécialité laitière, nature"},
    {"dish_name": "yaourt aux fruits",         "meal_types": "diner,dejeuner,gouter",  "ingredient_name": "yaourt aux fruits",                "quantity": 125, "unit": "g",     "agribalyse_match": "Yaourt, lait fermenté ou spécialité laitière, aux fruits, sucré"},
    {"dish_name": "crème dessert",             "meal_types": "diner,dejeuner",         "ingredient_name": "crème dessert",                    "quantity": 125, "unit": "g",     "agribalyse_match": "Crème dessert à la vanille, rayon frais"},
    {"dish_name": "flamby",                    "meal_types": "diner",                  "ingredient_name": "flan caramel",                     "quantity": 125, "unit": "g",     "agribalyse_match": "Flan aux œufs, rayon frais"},
    {"dish_name": "liégeois",                  "meal_types": "diner",                  "ingredient_name": "liégeois au chocolat",             "quantity": 125, "unit": "g",     "agribalyse_match": "Liégeois ou viennois (chocolat, café, caramel ou vanille), rayon frais"},
    {"dish_name": "mousse au chocolat",        "meal_types": "diner",                  "ingredient_name": "mousse au chocolat",               "quantity": 60,  "unit": "g",     "agribalyse_match": "Mousse au chocolat (base laitière), rayon frais"},
    {"dish_name": "mont blanc",                "meal_types": "diner",                  "ingredient_name": "mont blanc",                       "quantity": 135, "unit": "g",     "agribalyse_match": ""},
    # --- Ice cream ---
    {"dish_name": "glace",                     "meal_types": "dejeuner,diner",         "ingredient_name": "glace",                           "quantity": 100, "unit": "g",     "agribalyse_match": "Glace ou crème glacée, en bac"},
    {"dish_name": "glaces mini magnum",        "meal_types": "diner",                  "ingredient_name": "glace enrobée chocolat",           "quantity": 1,   "unit": "pièce", "agribalyse_match": "Glace ou crème glacée, bâtonnet, enrobé de chocolat"},
    # --- Cakes & pastries ---
    {"dish_name": "madeleine",                 "meal_types": "gouter",                 "ingredient_name": "madeleines",                       "quantity": 60,  "unit": "g",     "agribalyse_match": "Madeleine ordinaire, préemballée"},
    {"dish_name": "madeleines",                "meal_types": "gouter",                 "ingredient_name": "madeleines",                       "quantity": 60,  "unit": "g",     "agribalyse_match": "Madeleine ordinaire, préemballée"},
    {"dish_name": "madeleines pépites chocolat","meal_types": "gouter",                "ingredient_name": "madeleines pépites chocolat",      "quantity": 60,  "unit": "g",     "agribalyse_match": "Madeleine chocolatée, préemballée"},
    {"dish_name": "marbré",                    "meal_types": "gouter",                 "ingredient_name": "cake marbré",                      "quantity": 50,  "unit": "g",     "agribalyse_match": "Gâteau marbré"},
    {"dish_name": "quatre-quarts",             "meal_types": "gouter",                 "ingredient_name": "quatre-quarts",                    "quantity": 50,  "unit": "g",     "agribalyse_match": "Quatre-quarts ou barre pâtissière, préemballé"},
    {"dish_name": "gâteaux barre (quatre-quarts, marbré)", "meal_types": "gouter",    "ingredient_name": "gâteau barre (quatre-quarts)",     "quantity": 50,  "unit": "g",     "agribalyse_match": "Quatre-quarts ou barre pâtissière, préemballé"},
    {"dish_name": "savane",                    "meal_types": "gouter",                 "ingredient_name": "gâteau moelleux (savane)",         "quantity": 30,  "unit": "g",     "agribalyse_match": "Gâteau moelleux nature type génoise"},
    {"dish_name": "gâteaux sablés",            "meal_types": "gouter",                 "ingredient_name": "gâteaux sablés",                   "quantity": 50,  "unit": "g",     "agribalyse_match": "Gâteau sablé aux fruits, préemballé"},
    # --- Biscuits ---
    {"dish_name": "biscuits prince",           "meal_types": "gouter",                 "ingredient_name": "biscuits fourrés au chocolat",     "quantity": 50,  "unit": "g",     "agribalyse_match": "Biscuit sec chocolaté, préemballé"},
    {"dish_name": "gâteau prince",             "meal_types": "gouter",                 "ingredient_name": "biscuits fourrés au chocolat",     "quantity": 50,  "unit": "g",     "agribalyse_match": "Biscuit sec chocolaté, préemballé"},
    {"dish_name": "cookies",                   "meal_types": "gouter",                 "ingredient_name": "cookies aux pépites de chocolat",  "quantity": 50,  "unit": "g",     "agribalyse_match": "Cookie aux pépites de chocolat"},
    {"dish_name": "petits lu",                 "meal_types": "gouter",                 "ingredient_name": "biscuits petits beurre",           "quantity": 50,  "unit": "g",     "agribalyse_match": "Biscuit sec petit beurre"},
    {"dish_name": "dégustation tuc",           "meal_types": "dejeuner",               "ingredient_name": "biscuits apéritifs (TUC)",         "quantity": 50,  "unit": "g",     "agribalyse_match": "Biscuit apéritif, crackers, nature"},
    # --- Bread & viennoiseries ---
    {"dish_name": "pain au lait chocolat",     "meal_types": "gouter",                 "ingredient_name": "pains au lait au chocolat",        "quantity": 2,   "unit": "pièce", "agribalyse_match": "Pain au lait aux pépites de chocolat, préemballé"},
    {"dish_name": "pains au lait",             "meal_types": "gouter",                 "ingredient_name": "pains au lait",                    "quantity": 3,   "unit": "pièce", "agribalyse_match": "Pain au lait, préemballé"},
    {"dish_name": "pain chinois",              "meal_types": "gouter",                 "ingredient_name": "pain chinois (viennoiserie)",      "quantity": 1,   "unit": "pièce", "agribalyse_match": ""},
    # --- Fruit desserts ---
    {"dish_name": "pêches au sirop",           "meal_types": "dejeuner",               "ingredient_name": "pêches au sirop",                  "quantity": 200, "unit": "g",     "agribalyse_match": "Pêche au sirop léger, appertisée, égouttée"},
    {"dish_name": "fruits au sirop",           "meal_types": "dejeuner",               "ingredient_name": "fruits au sirop",                  "quantity": 200, "unit": "g",     "agribalyse_match": ""},
    # --- Drinks ---
    {"dish_name": "sirop",                     "meal_types": "gouter",                 "ingredient_name": "sirop de fruits dilué",            "quantity": 250, "unit": "ml",    "agribalyse_match": ""},
]


def load_agribalyse_names() -> list:
    if os.path.exists(XLSX_FILE):
        return _load_names_xlsx(XLSX_FILE)
    from match_agribalyse import load_agribalyse_names as _load
    return _load(CSV_FILE)


def main():
    rows = []
    with open(IN_FILE, encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh, delimiter=";")
        for row in reader:
            rows.append(dict(row))

    # Collect unique ingredient names that need Claude matching
    to_match = sorted({
        r["ingredient_name"]
        for r in rows
        if not r["agribalyse_match"].strip()
    })
    print(f"Ingredients needing Agribalyse match: {len(to_match)}")

    new_matches: dict[str, str | None] = {}

    if to_match:
        print("Loading Agribalyse food names...")
        agribalyse_names = load_agribalyse_names()
        valid_names = set(agribalyse_names)
        print(f"  {len(agribalyse_names)} names loaded")

        system_prompt = build_system_prompt(agribalyse_names)
        client = anthropic.Anthropic()

        batches = build_batches(to_match, BATCH_SIZE)
        for i, batch in enumerate(batches, 1):
            print(f"[{i}/{len(batches)}] Matching {len(batch)} ingredients...")
            try:
                matched = match_batch(client, system_prompt, batch, valid_names)
                new_matches.update(matched)
                hit = sum(1 for v in matched.values() if v)
                print(f"  → {hit}/{len(batch)} matched")
            except Exception as e:
                print(f"  Error: {e}", file=sys.stderr)
                new_matches.update({ing: None for ing in batch})

    ratio_rows = load_ratio_rows(RATIO_CSV_FILE) if os.path.exists(RATIO_CSV_FILE) else []

    updated = []
    for row in rows:
        ing_lower = row["ingredient_name"].strip().lower()

        # Apply known wrong-match fixes
        if ing_lower in WRONG_MATCHES:
            row["agribalyse_match"] = WRONG_MATCHES[ing_lower]
        elif ing_lower in MANUAL_MATCHES and not row["agribalyse_match"].strip():
            row["agribalyse_match"] = MANUAL_MATCHES[ing_lower]
        elif not row["agribalyse_match"].strip() and row["ingredient_name"] in new_matches:
            matched = new_matches[row["ingredient_name"]]
            row["agribalyse_match"] = matched if matched else ""

        # Recompute unit_multiplier
        agri = row["agribalyse_match"].strip() or None
        row["unit_multiplier"] = get_unit_multiplier(agri, row["unit"], ratio_rows)
        updated.append(row)

    # Append readymade dishes (bought-ready replacements for deleted from-scratch ones)
    readymade_added = 0
    for d in READYMADE_DISHES:
        agri = d["agribalyse_match"].strip() or None
        row = {
            "dish_name":       d["dish_name"],
            "meal_types":      d["meal_types"],
            "ingredient_name": d["ingredient_name"],
            "quantity":        d["quantity"],
            "unit":            d["unit"],
            "agribalyse_match": d["agribalyse_match"],
            "unit_multiplier":  get_unit_multiplier(agri, d["unit"], ratio_rows),
        }
        updated.append(row)
        readymade_added += 1

    os.makedirs("scripts/output", exist_ok=True)
    fieldnames = ["dish_name", "meal_types", "ingredient_name", "quantity", "unit", "agribalyse_match", "unit_multiplier"]
    with open(OUT_FILE, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(updated)

    still_missing = sum(1 for r in updated if not r["agribalyse_match"].strip())
    print(f"\nDone → {OUT_FILE}")
    print(f"  {len(updated)} ingredient rows ({readymade_added} readymade dishes re-added)")
    print(f"  {still_missing} without Agribalyse match (breadcrumbs, yeast, black olives, gherkin, kebab spices, pain chinois, fruits au sirop, sirop, mont blanc)")


if __name__ == "__main__":
    main()
