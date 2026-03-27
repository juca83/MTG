from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
import json
from typing import Optional, List

from database import get_db
from services import scryfall

router = APIRouter(prefix="/api/cards", tags=["cards"])


def row_to_card(row) -> dict:
    d = dict(row)
    for field in ["colors", "color_identity", "keywords", "legalities"]:
        if d.get(field) and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = []
    return d


async def cache_card(db: aiosqlite.Connection, card_data: dict):
    """Upsert a Scryfall card into local cache."""
    parsed = scryfall.parse_card(card_data)
    await db.execute(
        """INSERT OR REPLACE INTO scryfall_cards
           (id, name, set_code, set_name, collector_number,
            image_uri_normal, image_uri_small, image_uri_art_crop,
            colors, color_identity, type_line, oracle_text,
            cmc, power, toughness, rarity,
            price_usd, price_eur, price_usd_foil, price_eur_foil,
            keywords, layout, mana_cost, legalities, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)""",
        (
            parsed["id"], parsed["name"], parsed["set_code"], parsed["set_name"],
            parsed["collector_number"], parsed["image_uri_normal"], parsed["image_uri_small"],
            parsed["image_uri_art_crop"], parsed["colors"], parsed["color_identity"],
            parsed["type_line"], parsed["oracle_text"], parsed["cmc"],
            parsed["power"], parsed["toughness"], parsed["rarity"],
            parsed["price_usd"], parsed["price_eur"], parsed["price_usd_foil"],
            parsed["price_eur_foil"], parsed["keywords"], parsed["layout"],
            parsed["mana_cost"], parsed["legalities"],
        ),
    )
    await db.commit()


@router.get("/search")
async def search_cards(
    q: str = Query(..., description="Scryfall search query"),
    page: int = Query(1, ge=1),
    order: str = Query("name"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Proxy search to Scryfall and cache results."""
    try:
        result = await scryfall.search_cards(q, page=page, order=order)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scryfall error: {str(e)}")

    # Cache results in background
    cards = result.get("data", [])
    for card_data in cards:
        try:
            await cache_card(db, card_data)
        except Exception:
            pass

    # Enrich with collection info
    enriched = []
    for card_data in cards:
        parsed = scryfall.parse_card(card_data)
        # Restore list fields for response
        for field in ["colors", "color_identity", "keywords", "legalities"]:
            if parsed.get(field) and isinstance(parsed[field], str):
                try:
                    parsed[field] = json.loads(parsed[field])
                except Exception:
                    parsed[field] = []
        # Check if in collection
        async with db.execute(
            "SELECT SUM(quantity) as total FROM collection_entries WHERE scryfall_id = ?",
            (parsed["id"],),
        ) as cursor:
            row = await cursor.fetchone()
            parsed["in_collection"] = (row["total"] or 0) > 0
            parsed["collection_qty"] = row["total"] or 0
        enriched.append(parsed)

    return {
        "data": enriched,
        "total_cards": result.get("total_cards", len(cards)),
        "has_more": result.get("has_more", False),
        "next_page": result.get("next_page"),
    }


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=2)):
    """Autocomplete card names via Scryfall."""
    try:
        names = await scryfall.autocomplete(q)
        return {"data": names}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/sets")
async def get_sets():
    """Get all MTG sets."""
    try:
        sets = await scryfall.get_sets()
        return {"data": sets}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{scryfall_id}")
async def get_card(scryfall_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get a single card, from cache or Scryfall."""
    # Check cache first
    async with db.execute(
        "SELECT * FROM scryfall_cards WHERE id = ?", (scryfall_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if row:
            card = row_to_card(row)
            # Add collection info
            async with db.execute(
                """SELECT ce.*, l.name as location_name
                   FROM collection_entries ce
                   LEFT JOIN locations l ON ce.location_id = l.id
                   WHERE ce.scryfall_id = ?""",
                (scryfall_id,),
            ) as ce_cursor:
                entries = await ce_cursor.fetchall()
                card["collection_entries"] = [dict(e) for e in entries]
            return card

    # Fetch from Scryfall
    try:
        data = await scryfall.get_card_by_id(scryfall_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not data:
        raise HTTPException(status_code=404, detail="Card not found")

    await cache_card(db, data)
    parsed = scryfall.parse_card(data)
    for field in ["colors", "color_identity", "keywords", "legalities"]:
        if parsed.get(field) and isinstance(parsed[field], str):
            try:
                parsed[field] = json.loads(parsed[field])
            except Exception:
                parsed[field] = []
    parsed["collection_entries"] = []
    return parsed
