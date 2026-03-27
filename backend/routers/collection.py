from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
import json
from typing import Optional, List

from database import get_db
from models import CollectionEntryCreate, CollectionEntryUpdate
from routers.cards import cache_card, row_to_card
from services import scryfall

router = APIRouter(prefix="/api/collection", tags=["collection"])


def parse_entry_row(row) -> dict:
    d = dict(row)
    return d


async def get_entry_with_card(db, entry_id: int) -> dict:
    async with db.execute(
        """SELECT ce.*, sc.name, sc.set_code, sc.set_name, sc.collector_number,
                  sc.image_uri_normal, sc.image_uri_small, sc.image_uri_art_crop,
                  sc.colors, sc.color_identity, sc.type_line, sc.oracle_text,
                  sc.cmc, sc.power, sc.toughness, sc.rarity,
                  sc.price_usd, sc.price_eur, sc.price_usd_foil, sc.price_eur_foil,
                  sc.keywords, sc.layout, sc.mana_cost,
                  l.name as location_name, l.type as location_type, l.color as location_color
           FROM collection_entries ce
           JOIN scryfall_cards sc ON ce.scryfall_id = sc.id
           LEFT JOIN locations l ON ce.location_id = l.id
           WHERE ce.id = ?""",
        (entry_id,),
    ) as cursor:
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        for field in ["colors", "color_identity", "keywords"]:
            if d.get(field) and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except Exception:
                    d[field] = []
        return d


@router.get("")
async def list_collection(
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    color: Optional[str] = None,
    foil: Optional[bool] = None,
    is_proxy: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: aiosqlite.Connection = Depends(get_db),
):
    conditions = []
    params = []

    if location_id is not None:
        conditions.append("ce.location_id = ?")
        params.append(location_id)
    if search:
        conditions.append("sc.name LIKE ?")
        params.append(f"%{search}%")
    if foil is not None:
        conditions.append("ce.foil = ?")
        params.append(1 if foil else 0)
    if is_proxy is not None:
        conditions.append("ce.is_proxy = ?")
        params.append(1 if is_proxy else 0)
    if color:
        conditions.append("sc.color_identity LIKE ?")
        params.append(f'%"{color.upper()}"%')

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * per_page

    count_sql = f"""SELECT COUNT(*) as cnt FROM collection_entries ce
                    JOIN scryfall_cards sc ON ce.scryfall_id = sc.id {where}"""
    async with db.execute(count_sql, params) as cursor:
        row = await cursor.fetchone()
        total = row["cnt"]

    query = f"""SELECT ce.id, ce.scryfall_id, ce.quantity, ce.foil, ce.language,
                       ce.location_id, ce.is_proxy, ce.notes, ce.created_at, ce.updated_at,
                       sc.name, sc.set_code, sc.set_name, sc.collector_number,
                       sc.image_uri_normal, sc.image_uri_small, sc.image_uri_art_crop,
                       sc.colors, sc.color_identity, sc.type_line, sc.oracle_text,
                       sc.cmc, sc.power, sc.toughness, sc.rarity,
                       sc.price_usd, sc.price_eur, sc.price_usd_foil, sc.price_eur_foil,
                       sc.keywords, sc.layout, sc.mana_cost,
                       l.name as location_name, l.type as location_type, l.color as location_color
                FROM collection_entries ce
                JOIN scryfall_cards sc ON ce.scryfall_id = sc.id
                LEFT JOIN locations l ON ce.location_id = l.id
                {where}
                ORDER BY sc.name ASC
                LIMIT ? OFFSET ?"""
    params_paginated = params + [per_page, offset]

    async with db.execute(query, params_paginated) as cursor:
        rows = await cursor.fetchall()

    entries = []
    for row in rows:
        d = dict(row)
        for field in ["colors", "color_identity", "keywords"]:
            if d.get(field) and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except Exception:
                    d[field] = []
        entries.append(d)

    return {"data": entries, "total": total, "page": page, "per_page": per_page}


@router.post("", status_code=201)
async def add_to_collection(
    entry: CollectionEntryCreate,
    db: aiosqlite.Connection = Depends(get_db),
):
    # Ensure card is cached
    async with db.execute(
        "SELECT id FROM scryfall_cards WHERE id = ?", (entry.scryfall_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if not row:
            card_data = await scryfall.get_card_by_id(entry.scryfall_id)
            if not card_data:
                raise HTTPException(status_code=404, detail="Card not found on Scryfall")
            await cache_card(db, card_data)

    # Check for existing entry with same scryfall_id + foil + language + location
    async with db.execute(
        """SELECT id, quantity FROM collection_entries
           WHERE scryfall_id = ? AND foil = ? AND language = ? AND location_id IS ?
           AND is_proxy = ?""",
        (entry.scryfall_id, entry.foil, entry.language, entry.location_id, entry.is_proxy),
    ) as cursor:
        existing = await cursor.fetchone()

    if existing:
        new_qty = existing["quantity"] + entry.quantity
        await db.execute(
            "UPDATE collection_entries SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_qty, existing["id"]),
        )
        await db.commit()
        result = await get_entry_with_card(db, existing["id"])
        return result

    async with db.execute(
        """INSERT INTO collection_entries (scryfall_id, quantity, foil, language, location_id, is_proxy, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (entry.scryfall_id, entry.quantity, entry.foil, entry.language,
         entry.location_id, entry.is_proxy, entry.notes),
    ) as cursor:
        new_id = cursor.lastrowid

    await db.commit()
    result = await get_entry_with_card(db, new_id)
    return result


@router.get("/stats")
async def collection_stats(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT COUNT(*) as entries, SUM(quantity) as total_cards FROM collection_entries WHERE is_proxy = FALSE"
    ) as cursor:
        row = await cursor.fetchone()
        entries = row["entries"] or 0
        total = row["total_cards"] or 0

    async with db.execute(
        """SELECT l.name, l.type, SUM(ce.quantity) as count
           FROM collection_entries ce
           JOIN locations l ON ce.location_id = l.id
           GROUP BY l.id ORDER BY count DESC"""
    ) as cursor:
        by_location = [dict(r) for r in await cursor.fetchall()]

    return {"unique_entries": entries, "total_cards": total, "by_location": by_location}


@router.get("/{entry_id}")
async def get_collection_entry(entry_id: int, db: aiosqlite.Connection = Depends(get_db)):
    result = await get_entry_with_card(db, entry_id)
    if not result:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result


@router.patch("/{entry_id}")
async def update_collection_entry(
    entry_id: int,
    update: CollectionEntryUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT id FROM collection_entries WHERE id = ?", (entry_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Entry not found")

    fields = update.model_dump(exclude_none=True)
    if not fields:
        result = await get_entry_with_card(db, entry_id)
        return result

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [entry_id]
    await db.execute(
        f"UPDATE collection_entries SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        values,
    )
    await db.commit()
    return await get_entry_with_card(db, entry_id)


@router.delete("/{entry_id}", status_code=204)
async def delete_collection_entry(entry_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT id FROM collection_entries WHERE id = ?", (entry_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Entry not found")
    await db.execute("DELETE FROM collection_entries WHERE id = ?", (entry_id,))
    await db.commit()
