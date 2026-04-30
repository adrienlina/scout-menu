import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from match_agribalyse import build_batches, parse_batch_response, ilike_match

# --- ilike_match ---

def test_ilike_match_simple():
    assert ilike_match("%farine%", "Farine de blé T55") is True

def test_ilike_match_multi_segment():
    assert ilike_match("%ail%gousse%", "Ail, gousse, cru") is True

def test_ilike_match_no_match():
    assert ilike_match("%tomate%", "Farine de blé T55") is False

def test_ilike_match_case_insensitive():
    assert ilike_match("%FARINE%", "farine de blé") is True

# --- build_batches ---

def test_build_batches_splits_correctly():
    items = list(range(45))
    batches = build_batches(items, batch_size=20)
    assert len(batches) == 3
    assert len(batches[0]) == 20
    assert len(batches[1]) == 20
    assert len(batches[2]) == 5

def test_build_batches_single():
    items = ["sel"]
    batches = build_batches(items, batch_size=20)
    assert batches == [["sel"]]

# --- parse_batch_response ---

def test_parse_batch_response_valid():
    response_text = '{"farine de blé": "Farine de blé T55", "sel": null, "huile": "Huile d\'olive"}'
    batch = ["farine de blé", "sel", "huile"]
    result = parse_batch_response(response_text, batch)
    assert result["farine de blé"] == "Farine de blé T55"
    assert result["sel"] is None
    assert result["huile"] == "Huile d'olive"

def test_parse_batch_response_strips_fences():
    response_text = '```json\n{"sel": null}\n```'
    result = parse_batch_response(response_text, ["sel"])
    assert result["sel"] is None

def test_parse_batch_response_missing_keys_default_none():
    response_text = '{"farine": "Farine T55"}'
    batch = ["farine", "sel"]
    result = parse_batch_response(response_text, batch)
    assert result.get("sel") is None
