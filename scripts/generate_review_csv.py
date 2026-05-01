#!/usr/bin/env python3
"""Generate a review CSV from dishes_with_ingredients.json.

Columns: dish_name, meal_types, ingredient_name, quantity, unit,
         agribalyse_match, unit_multiplier

Usage:
    python3 scripts/generate_review_csv.py
"""

import csv
import json
import os

from generate_sql import (
    AGRIBALYSE_MAP_FILE,
    MEAL_TYPE_PRIORITY,
    RATIO_CSV_FILE,
    get_unit_multiplier,
    load_ratio_rows,
)

IN_FILE = "scripts/output/dishes_with_ingredients.json"
OUT_FILE = "scripts/output/dishes_review.csv"


def main():
    with open(IN_FILE, encoding="utf-8") as fh:
        dishes = json.load(fh)

    agribalyse_map = {}
    if os.path.exists(AGRIBALYSE_MAP_FILE):
        with open(AGRIBALYSE_MAP_FILE, encoding="utf-8") as fh:
            agribalyse_map = json.load(fh)

    ratio_rows = []
    if os.path.exists(RATIO_CSV_FILE):
        ratio_rows = load_ratio_rows(RATIO_CSV_FILE)

    os.makedirs("scripts/output", exist_ok=True)
    with open(OUT_FILE, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["dish_name", "meal_types", "ingredient_name", "quantity", "unit", "agribalyse_match", "unit_multiplier"])

        for dish in dishes:
            name = dish["name"]
            meal_types = dish.get("meal_types", [])
            meal_type = next((t for t in MEAL_TYPE_PRIORITY if t in meal_types), meal_types[0] if meal_types else "")
            meal_types_str = ",".join(meal_types)

            for ing in dish.get("ingredients", []):
                ing_name = ing["name"]
                agribalyse_name = agribalyse_map.get(ing_name) or ""
                multiplier = get_unit_multiplier(agribalyse_name or None, ing["unit"], ratio_rows)
                writer.writerow([name, meal_types_str, ing_name, ing["quantity"], ing["unit"], agribalyse_name, multiplier])

    print(f"Done → {OUT_FILE}")


if __name__ == "__main__":
    main()
