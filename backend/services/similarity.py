import json
from typing import List, Dict, Any, Optional
import aiosqlite


def parse_json_field(val) -> list:
    if not val:
        return []
    if isinstance(val, list):
        return val
    try:
        return json.loads(val)
    except Exception:
        return []


def card_type_category(type_line: Optional[str]) -> str:
    """Extract primary card type."""
    if not type_line:
        return "unknown"
    tl = type_line.lower()
    for t in ["creature", "planeswalker", "instant", "sorcery", "enchantment", "artifact", "land"]:
        if t in tl:
            return t
    return "other"


def similarity_score(card_a: Dict, card_b: Dict) -> float:
    """
    Score how similar two cards are (0-100).
    Used for suggesting collection cards as replacements.
    """
    score = 0.0

    # CMC match
    cmc_a = card_a.get("cmc") or 0
    cmc_b = card_b.get("cmc") or 0
    cmc_diff = abs(cmc_a - cmc_b)
    if cmc_diff == 0:
        score += 30
    elif cmc_diff == 1:
        score += 15
    elif cmc_diff == 2:
        score += 5

    # Card type match
    type_a = card_type_category(card_a.get("type_line"))
    type_b = card_type_category(card_b.get("type_line"))
    if type_a == type_b:
        score += 25

    # Color identity overlap
    ci_a = set(parse_json_field(card_a.get("color_identity")))
    ci_b = set(parse_json_field(card_b.get("color_identity")))
    if ci_a and ci_b:
        overlap = len(ci_a & ci_b) / max(len(ci_a), len(ci_b))
        score += overlap * 20

    # Keyword overlap
    kw_a = set(k.lower() for k in parse_json_field(card_a.get("keywords")))
    kw_b = set(k.lower() for k in parse_json_field(card_b.get("keywords")))
    if kw_a and kw_b:
        kw_overlap = len(kw_a & kw_b) / max(len(kw_a), len(kw_b))
        score += kw_overlap * 15

    # Subtype overlap in type_line
    tl_a = set((card_a.get("type_line") or "").lower().split())
    tl_b = set((card_b.get("type_line") or "").lower().split())
    subtype_overlap = len(tl_a & tl_b) / max(len(tl_a), len(tl_b)) if tl_a and tl_b else 0
    score += subtype_overlap * 10

    return score


async def find_similar_in_collection(
    missing_card: Dict,
    db: aiosqlite.Connection,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Find cards in user's collection similar to the missing card.
    Returns list of (collection_entry + card + score).
    """
    # Fetch collection cards with card data
    async with db.execute(
        """SELECT ce.id as entry_id, ce.quantity, ce.foil, ce.language,
                  ce.location_id, ce.is_proxy,
                  sc.id, sc.name, sc.set_code, sc.set_name,
                  sc.image_uri_normal, sc.image_uri_small,
                  sc.colors, sc.color_identity, sc.type_line,
                  sc.oracle_text, sc.cmc, sc.power, sc.toughness,
                  sc.rarity, sc.price_usd, sc.price_eur,
                  sc.keywords, sc.layout, sc.mana_cost,
                  l.name as location_name
           FROM collection_entries ce
           JOIN scryfall_cards sc ON ce.scryfall_id = sc.id
           LEFT JOIN locations l ON ce.location_id = l.id
           WHERE ce.is_proxy = FALSE"""
    ) as cursor:
        rows = await cursor.fetchall()

    results = []
    for row in rows:
        if row["id"] == missing_card.get("id"):
            continue
        card_dict = dict(row)
        score = similarity_score(missing_card, card_dict)
        if score > 20:
            results.append({"score": score, "card": card_dict})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]
