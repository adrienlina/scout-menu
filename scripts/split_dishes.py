#!/usr/bin/env python3
"""Split meal descriptions into individual dishes using Claude.

Reads scripts/output/raw_menus.json, asks Claude Sonnet to identify individual
dishes in each meal description, deduplicates across all camps, and writes
scripts/output/unique_dishes.json.

Usage:
    python3 scripts/split_dishes.py
"""

import json
import os
import sys
import anthropic

RAW_MENUS = "scripts/output/raw_menus.json"
OUT_FILE = "scripts/output/unique_dishes.json"

SYSTEM_PROMPT = """Tu es un assistant qui analyse des menus de camps scouts français.
On te donne la description d'un repas (petit-déjeuner, déjeuner, goûter ou dîner).
Tu dois identifier les plats individuels présents dans cette description.

Règles :
- Un repas peut contenir plusieurs plats (entrée, plat principal, dessert, etc.)
- Les séparateurs courants sont " - ", " + ", "/", ","
- Parfois c'est un plat avec sa garniture : "poulet curry + riz" → un seul plat "poulet curry avec riz"
- Parfois c'est plusieurs plats distincts : "soupe - pâtes bolognaise - compote" → 3 plats
- Les listes d'ingrédients typiques du petit-déjeuner (ex: "lait, pain, beurre, confiture, céréales") → 1 seul plat nommé "petit-déjeuner classique"
- Normalise les noms : minuscules, sans fautes, forme canonique (ex: "carottes râpées", "saucisse purée")
- Si la description est vide ou incompréhensible, retourne une liste vide

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{"dishes": ["nom du plat 1", "nom du plat 2", ...]}
"""

def collect_unique_descriptions(camps: list) -> dict[str, dict]:
    """Return mapping: description → {meal_type, count}"""
    desc_map: dict[str, dict] = {}
    for camp in camps:
        for day in camp["days"]:
            for meal in day["meals"]:
                desc = meal["description"].strip()
                if not desc:
                    continue
                if desc not in desc_map:
                    desc_map[desc] = {"meal_type": meal["meal_type"], "count": 0}
                desc_map[desc]["count"] += 1
    return desc_map


def split_description(client: anthropic.Anthropic, description: str, meal_type: str) -> list[str]:
    """Ask Claude to split one meal description into individual dish names."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Type de repas : {meal_type}\nDescription : {description}",
            }
        ],
    )
    text = response.content[0].text.strip()
    try:
        data = json.loads(text)
        return [d.strip() for d in data.get("dishes", []) if d.strip()]
    except json.JSONDecodeError:
        print(f"  Warning: could not parse JSON for '{description}': {text[:100]}", file=sys.stderr)
        return []


def main():
    if not os.path.exists(RAW_MENUS):
        print(f"Error: {RAW_MENUS} not found. Run parse_camp_html.py first.", file=sys.stderr)
        sys.exit(1)

    camps = json.load(open(RAW_MENUS, encoding="utf-8"))
    desc_map = collect_unique_descriptions(camps)
    print(f"Found {len(desc_map)} unique meal descriptions across {len(camps)} camps.")

    client = anthropic.Anthropic()

    # dish_name → {meal_types: set, source_descriptions: list}
    all_dishes: dict[str, dict] = {}

    for i, (description, meta) in enumerate(desc_map.items(), 1):
        print(f"[{i}/{len(desc_map)}] Splitting: {description[:60]}...", end=" ", flush=True)
        dishes = split_description(client, description, meta["meal_type"])
        print(f"→ {dishes}")
        for dish in dishes:
            key = dish.lower()
            if key not in all_dishes:
                all_dishes[key] = {
                    "name": dish,
                    "meal_types": [],
                    "source_descriptions": [],
                }
            if meta["meal_type"] not in all_dishes[key]["meal_types"]:
                all_dishes[key]["meal_types"].append(meta["meal_type"])
            if description not in all_dishes[key]["source_descriptions"]:
                all_dishes[key]["source_descriptions"].append(description)

    result = list(all_dishes.values())
    result.sort(key=lambda d: d["name"])

    os.makedirs("scripts/output", exist_ok=True)
    json.dump(result, open(OUT_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nDone. {len(result)} unique dishes written to {OUT_FILE}")


if __name__ == "__main__":
    main()
