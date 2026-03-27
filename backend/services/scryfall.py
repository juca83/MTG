import httpx
import asyncio
import json
from typing import Optional, List, Dict, Any

SCRYFALL_BASE = "https://api.scryfall.com"

# Rate limiting: Scryfall requests max 10/sec, we use a small delay
_semaphore = asyncio.Semaphore(5)


def parse_card(data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse a Scryfall card object into our DB format."""
    images = data.get("image_uris", {})
    # For double-faced cards, use front face
    if not images and data.get("card_faces"):
        images = data["card_faces"][0].get("image_uris", {})

    prices = data.get("prices", {})

    def safe_float(val):
        try:
            return float(val) if val else None
        except (ValueError, TypeError):
            return None

    return {
        "id": data["id"],
        "name": data["name"],
        "set_code": data["set"],
        "set_name": data.get("set_name", ""),
        "collector_number": data.get("collector_number"),
        "image_uri_normal": images.get("normal"),
        "image_uri_small": images.get("small"),
        "image_uri_art_crop": images.get("art_crop"),
        "colors": json.dumps(data.get("colors", [])),
        "color_identity": json.dumps(data.get("color_identity", [])),
        "type_line": data.get("type_line"),
        "oracle_text": data.get("oracle_text") or (
            data["card_faces"][0].get("oracle_text") if data.get("card_faces") else None
        ),
        "cmc": data.get("cmc"),
        "power": data.get("power"),
        "toughness": data.get("toughness"),
        "rarity": data.get("rarity"),
        "price_usd": safe_float(prices.get("usd")),
        "price_eur": safe_float(prices.get("eur")),
        "price_usd_foil": safe_float(prices.get("usd_foil")),
        "price_eur_foil": safe_float(prices.get("eur_foil")),
        "keywords": json.dumps(data.get("keywords", [])),
        "layout": data.get("layout"),
        "mana_cost": data.get("mana_cost") or (
            data["card_faces"][0].get("mana_cost") if data.get("card_faces") else None
        ),
        "legalities": json.dumps(data.get("legalities", {})),
    }


async def search_cards(query: str, page: int = 1, order: str = "name") -> Dict[str, Any]:
    """Search cards via Scryfall API."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/cards/search",
                params={"q": query, "page": page, "order": order, "include_extras": "false"},
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            if resp.status_code == 404:
                return {"data": [], "total_cards": 0, "has_more": False}
            resp.raise_for_status()
            return resp.json()


async def get_card_by_id(scryfall_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single card by Scryfall UUID."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/cards/{scryfall_id}",
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()


async def get_card_by_name(name: str, set_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetch a card by exact name (and optionally set)."""
    params = {"exact": name}
    if set_code:
        params["set"] = set_code
    async with _semaphore:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/cards/named",
                params=params,
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            if resp.status_code == 404:
                # Try fuzzy
                params2 = {"fuzzy": name}
                if set_code:
                    params2["set"] = set_code
                resp2 = await client.get(
                    f"{SCRYFALL_BASE}/cards/named",
                    params=params2,
                    headers={"User-Agent": "MTG-Collection-Manager/1.0"},
                )
                if resp2.status_code == 404:
                    return None
                resp2.raise_for_status()
                return resp2.json()
            resp.raise_for_status()
            return resp.json()


async def get_sets() -> List[Dict[str, Any]]:
    """Get all MTG sets from Scryfall."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/sets",
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            resp.raise_for_status()
            return resp.json().get("data", [])


async def get_card_by_set_number(set_code: str, collector_number: str) -> Optional[Dict[str, Any]]:
    """Fetch a card by set code and collector number."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/cards/{set_code}/{collector_number}",
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()


async def autocomplete(query: str) -> List[str]:
    """Autocomplete card names."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{SCRYFALL_BASE}/cards/autocomplete",
                params={"q": query},
                headers={"User-Agent": "MTG-Collection-Manager/1.0"},
            )
            resp.raise_for_status()
            return resp.json().get("data", [])
