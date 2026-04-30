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
    return bool(re.fullmatch(f".*{regex}.*", text.lower())) if regex else True


def build_batches(items: list, batch_size: int) -> list:
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


def parse_batch_response(text: str, batch: list, valid_names: set = None) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
    if not isinstance(data, dict):
        data = {}
    result = {ing: data.get(ing) for ing in batch}
    if valid_names is not None:
        result = {k: (v if v in valid_names else None) for k, v in result.items()}
    return result


def load_agribalyse_names(csv_path: str) -> list:
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


def build_system_prompt(agribalyse_names: list) -> str:
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


def match_batch(client: anthropic.Anthropic, system_prompt: str, batch: list, valid_names: set = None) -> dict:
    user_msg = json.dumps(batch, ensure_ascii=False)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": f"Ingrédients: {user_msg}"}],
    )
    if response.stop_reason == "max_tokens":
        print(f"  Warning: response truncated (max_tokens). Consider reducing BATCH_SIZE.", file=sys.stderr)
    return parse_batch_response(response.content[0].text, batch, valid_names)


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
    valid_names = set(agribalyse_names)
    print(f"Loaded {len(agribalyse_names)} Agribalyse food names from CSV.")

    system_prompt = build_system_prompt(agribalyse_names)
    client = anthropic.Anthropic()

    result = {}
    batches = build_batches(unique_ingredients, BATCH_SIZE)
    for i, batch in enumerate(batches, 1):
        print(f"[{i}/{len(batches)}] Matching batch of {len(batch)}...")
        try:
            matched = match_batch(client, system_prompt, batch, valid_names)
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
