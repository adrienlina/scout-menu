#!/usr/bin/env python3
"""Generate ingredient lists for each unique dish using Claude Haiku.

Reads scripts/output/unique_dishes.json, calls Claude Haiku in parallel for
each dish to produce a per-person ingredient list, and writes
scripts/output/dishes_with_ingredients.json.

Usage:
    python3 scripts/generate_ingredients.py
"""

import json
import os
import re
import sys
import concurrent.futures
import anthropic

IN_FILE = "scripts/output/unique_dishes.json"
OUT_FILE = "scripts/output/dishes_with_ingredients.json"
MAX_WORKERS = 10

SYSTEM_PROMPT = """Tu es un assistant culinaire expert en cuisine de camp scout.
On te donne le nom d'un plat. Tu dois fournir la liste des ingrédients nécessaires pour préparer ce plat pour UNE personne.

Contexte important :
- Ce sont des repas pour des camps scouts avec des enfants qui participent à la cuisine
- Les plats sont souvent simples, avec des ingrédients faciles à trouver en grande surface
- La cuisine se fait sur réchaud à feu ou feu de camp
- Les recettes doivent être adaptées à une cuisson en plein air, en grande quantité

Format des quantités :
- Utilise des grammes (g) pour les solides pesables
- Utilise des millilitres (ml) pour les liquides
- Utilise "pièce(s)" pour les éléments qu'on compte (œufs, carottes, etc.)
- Arrondis à des valeurs pratiques (50g, 100g, pas 73g)

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{
  "ingredients": [
    {"name": "nom de l'ingrédient", "quantity": 100, "unit": "g"},
    {"name": "autre ingrédient", "quantity": 1, "unit": "pièce"}
  ]
}

Si le plat est un produit industriel (ex: "quatre-quarts", "madeleines", "crème dessert"), donne quand même des ingrédients approximatifs ou les composants achetés.
Si la description est trop vague (ex: "fruit", "fromage"), donne un exemple représentatif.
"""

def generate_for_dish(client: anthropic.Anthropic, dish: dict) -> dict:
    """Call Haiku for one dish and return the dish dict with ingredients added."""
    name = dish["name"]
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Plat : {name}"}
            ],
        )
        text = response.content[0].text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text).strip()
        if not text:
            return {**dish, "ingredients": [], "error": None}
        # Take only the first JSON object if multiple are returned
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try extracting the first {...} block
            m = re.search(r'\{.*?\}(?=\s*\{|\s*$)', text, re.DOTALL)
            if m:
                data = json.loads(m.group(0))
            else:
                raise
        ingredients = data.get("ingredients", [])
        # Validate structure
        validated = []
        for ing in ingredients:
            if all(k in ing for k in ("name", "quantity", "unit")):
                try:
                    qty = float(ing["quantity"])
                except (ValueError, TypeError):
                    qty = 1.0  # fallback for non-numeric quantities like "à goût"
                validated.append({
                    "name": ing["name"],
                    "quantity": qty,
                    "unit": ing["unit"],
                })
        return {**dish, "ingredients": validated, "error": None}
    except Exception as e:
        print(f"  Error for '{name}': {e}", file=sys.stderr)
        return {**dish, "ingredients": [], "error": str(e)}


def main():
    if not os.path.exists(IN_FILE):
        print(f"Error: {IN_FILE} not found. Run split_dishes.py first.", file=sys.stderr)
        sys.exit(1)

    dishes = json.load(open(IN_FILE, encoding="utf-8"))
    print(f"Generating ingredients for {len(dishes)} dishes (parallel, {MAX_WORKERS} workers)...")

    client = anthropic.Anthropic()
    results = []
    completed = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(generate_for_dish, client, dish): dish for dish in dishes}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            completed += 1
            status = "ok" if not result["error"] else f"ERR: {result['error'][:40]}"
            print(f"[{completed}/{len(dishes)}] {result['name'][:50]} → {status}")
            results.append(result)

    results.sort(key=lambda d: d["name"])

    os.makedirs("scripts/output", exist_ok=True)
    json.dump(results, open(OUT_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    errors = [r for r in results if r["error"]]
    print(f"\nDone. {len(results)} dishes, {len(errors)} errors → {OUT_FILE}")


if __name__ == "__main__":
    main()
