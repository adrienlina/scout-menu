#!/usr/bin/env python3
"""Import dishes with ingredients into Supabase.

Reads scripts/output/dishes_with_ingredients.json and inserts records into
the `menus` and `menu_ingredients` tables using the service role key to
bypass RLS.

Requires SUPABASE_SERVICE_ROLE_KEY in .env (or environment).

Usage:
    python3 scripts/import_to_supabase.py [--dry-run]
"""

import json
import os
import sys
import argparse
from dotenv import load_dotenv
from supabase import create_client

IN_FILE = "scripts/output/dishes_with_ingredients.json"

MEAL_TYPE_MAP = {
    "petit-dejeuner": "petit-dejeuner",
    "dejeuner": "dejeuner",
    "gouter": "gouter",
    "diner": "diner",
}


def load_config():
    load_dotenv()
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url:
        print("Error: VITE_SUPABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    if not key:
        print(
            "Error: SUPABASE_SERVICE_ROLE_KEY not set.\n"
            "Add it to .env: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n"
            "Find it in Supabase Dashboard → Project Settings → API → service_role",
            file=sys.stderr,
        )
        sys.exit(1)
    return url, key


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print what would be inserted without touching the DB")
    args = parser.parse_args()

    dishes = json.load(open(IN_FILE, encoding="utf-8"))
    dishes_to_import = [d for d in dishes if not d.get("error") or d.get("ingredients")]
    print(f"Importing {len(dishes_to_import)} dishes ({len(dishes) - len(dishes_to_import)} skipped due to errors)...")

    if args.dry_run:
        for d in dishes_to_import[:5]:
            print(f"  MENU: {d['name']} ({', '.join(d['meal_types'])}) → {len(d['ingredients'])} ingredients")
        print(f"  ... and {len(dishes_to_import) - 5} more")
        return

    url, key = load_config()
    supabase = create_client(url, key)

    # Check for existing dishes to avoid duplicates
    existing = supabase.table("menus").select("name").eq("is_default", True).execute()
    existing_names = {row["name"].lower() for row in existing.data}
    print(f"Found {len(existing_names)} existing default menus in DB.")

    inserted_menus = 0
    inserted_ingredients = 0
    skipped = 0

    for dish in dishes_to_import:
        name = dish["name"]
        if name.lower() in existing_names:
            print(f"  SKIP (exists): {name}")
            skipped += 1
            continue

        # Pick the most specific meal_type (prefer diner/dejeuner over gouter)
        meal_types = dish.get("meal_types", [])
        priority = ["diner", "dejeuner", "petit-dejeuner", "gouter"]
        meal_type = next((t for t in priority if t in meal_types), meal_types[0] if meal_types else "diner")

        # Insert menu
        menu_data = {
            "name": name,
            "description": None,
            "meal_type": meal_type,
            "is_default": True,
            "user_id": None,
        }
        result = supabase.table("menus").insert(menu_data).execute()
        if not result.data:
            print(f"  ERROR inserting menu '{name}': {result}", file=sys.stderr)
            continue
        menu_id = result.data[0]["id"]
        inserted_menus += 1

        # Insert ingredients
        if dish.get("ingredients"):
            ing_data = [
                {
                    "menu_id": menu_id,
                    "name": ing["name"],
                    "quantity": ing["quantity"],
                    "unit": ing["unit"],
                }
                for ing in dish["ingredients"]
            ]
            ing_result = supabase.table("menu_ingredients").insert(ing_data).execute()
            inserted_ingredients += len(ing_result.data)

        print(f"  OK: {name} ({meal_type}) → {len(dish.get('ingredients', []))} ingredients")

    print(f"\nDone. {inserted_menus} menus inserted, {inserted_ingredients} ingredients, {skipped} skipped.")


if __name__ == "__main__":
    main()
