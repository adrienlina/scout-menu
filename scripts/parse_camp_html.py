#!/usr/bin/env python3
"""Parse an SGDF camp HTML file and extract the menu into JSON.

Usage:
    python3 scripts/parse_camp_html.py <path-to-html-file>
"""

import sys
import json
import re
from html.parser import HTMLParser
from datetime import datetime


MEAL_TYPE_MAP = {
    "Petit déjeuner": "petit-dejeuner",
    "Déjeuner": "dejeuner",
    "Goûter": "gouter",
    "Dîner": "diner",
}

FRENCH_DAYS = {
    "Lundi", "Mardi", "Mercredi", "Jeudi",
    "Vendredi", "Samedi", "Dimanche",
}

NOISE_TOKENS = {"arrow_drop_down", "arrow_drop_up", "mode_edit", "Déplacer"}


class TitleExtractor(HTMLParser):
    """Extract the <title> tag content."""

    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ""

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


class BodyTextExtractor(HTMLParser):
    """Strip all HTML tags and collect visible text, skipping <script>/<style>."""

    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ("script", "style"):
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in ("script", "style") and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self.parts.append(text)


def extract_title(html: str) -> str:
    parser = TitleExtractor()
    parser.feed(html)
    title = parser.title.strip()
    # Keep only the camp name part (before " - ")
    if " - " in title:
        title = title.split(" - ")[0].strip()
    return title


def extract_body_text(html: str) -> str:
    parser = BodyTextExtractor()
    parser.feed(html)
    return "\n".join(parser.parts)


def find_menu_section(text: str) -> str:
    """Return the text slice that contains only menu rows."""
    # Locate the table header that marks the start of the menu
    header = "Jour\nDéplacer\nRepas\nDescription"
    header_pos = text.find(header)
    if header_pos == -1:
        # Fallback: just find "Jour" followed by the day rows
        header_pos = text.find("Jour\n")
        if header_pos == -1:
            raise ValueError("Could not find menu header ('Jour / Déplacer / Repas / Description') in the HTML.")
        menu_start = header_pos + len("Jour\n")
    else:
        menu_start = header_pos + len(header) + 1  # +1 for trailing newline

    # The menu ends at the "Enregistrer" button that follows all rows.
    # There may be an earlier "Enregistrer" in the nav bar; we want the one
    # that comes AFTER the menu start.
    end_pos = text.find("Enregistrer", menu_start)
    if end_pos == -1:
        # No closing marker — take everything from menu_start
        return text[menu_start:]
    return text[menu_start:end_pos]


def parse_menu_rows(section: str) -> list[dict]:
    """
    Parse the menu section text into a list of row dicts.

    Each row looks like (newline-separated tokens):
        <DayName> <DD/MM/YYYY>
        [arrow_drop_up]
        [arrow_drop_down]
        <MealType>
        [description]        ← optional, absent when meal not filled in
        mode_edit
    """
    lines = [line.strip() for line in section.splitlines()]
    # Remove empty lines and noise tokens (arrows, mode_edit)
    tokens = [l for l in lines if l and l not in NOISE_TOKENS]

    rows = []
    i = 0
    date_re = re.compile(
        r"^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+(\d{2}/\d{2}/\d{4})$"
    )

    while i < len(tokens):
        m = date_re.match(tokens[i])
        if not m:
            i += 1
            continue

        day_name = m.group(1)
        raw_date = m.group(2)  # DD/MM/YYYY
        i += 1

        # Next token must be a meal type
        if i >= len(tokens) or tokens[i] not in MEAL_TYPE_MAP:
            # Unexpected structure; skip
            continue

        meal_type_raw = tokens[i]
        i += 1

        # Optionally followed by a description (any token that is NOT a day
        # header and NOT a meal type)
        description = ""
        if i < len(tokens):
            next_token = tokens[i]
            is_day = date_re.match(next_token)
            is_meal = next_token in MEAL_TYPE_MAP
            if not is_day and not is_meal:
                description = next_token
                i += 1

        # Convert date to ISO format
        day_dt = datetime.strptime(raw_date, "%d/%m/%Y")
        iso_date = day_dt.strftime("%Y-%m-%d")

        rows.append(
            {
                "date": iso_date,
                "day_name": day_name,
                "meal_type": MEAL_TYPE_MAP[meal_type_raw],
                "description": description,
            }
        )

    return rows


def group_by_day(rows: list[dict]) -> list[dict]:
    """Group meal rows into day objects, preserving day order."""
    days: dict[str, dict] = {}
    order: list[str] = []

    for row in rows:
        key = row["date"]
        if key not in days:
            days[key] = {
                "date": row["date"],
                "day_name": row["day_name"],
                "meals": [],
            }
            order.append(key)
        days[key]["meals"].append(
            {
                "meal_type": row["meal_type"],
                "description": row["description"],
            }
        )

    return [days[k] for k in order]


def parse_html_file(path: str) -> dict:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        html = f.read()

    camp_name = extract_title(html)
    body_text = extract_body_text(html)
    menu_section = find_menu_section(body_text)
    rows = parse_menu_rows(menu_section)
    days = group_by_day(rows)

    return {
        "camp_name": camp_name,
        "days": days,
    }


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path-to-html-file>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    result = parse_html_file(path)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
