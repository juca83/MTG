from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
import json
from typing import Optional

from database import get_db
from models import DeckCreate, DeckUpdate, DeckEntryCreate, DeckEntryUpdate
from routers.cards import cache_card, row_to_card
from services import scryfall, similarity

router = APIRouter(prefix="/api/decks", tags=["decks"])


def parse_card_fields(d: dict) -> dict:
    for field in ["colors", "color_identity", "keywords"]:
        if d.get(field) and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = []
    return d


async def get_deck_with_counts(db, deck_id: int) -> Optional[dict]:
    async with db.execute("SELECT * FROM decks WHERE id = ?", (deck_id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            return None
    d = dict(row)
    if d.get("colors") and isinstance(d["colors"], str):
        try:
            d["colors"] = json.loads(d["colors"])
        except Exception:
            d["colors"] = []

    async with db.execute(
        "SELECT SUM(quantity) as cnt FROM deck_entries WHERE deck_id = ? AND board = 'main'",
        (deck_id,),
    ) as cursor:
        row = await cursor.fetchone()
        d["card_count"] = row["cnt"] or 0

    async with db.execute(
        """SELECT SUM(de.quantity) as cnt FROM deck_entries de
           WHERE de.deck_id = ? AND de.board = 'main'
           AND de.collection_entry_id IS NULL""",
        (deck_id,),
    ) as cursor:
        row = await cursor.fetchone()
        d["missing_count"] = row["cnt"] or 0

    return d


@router.get("")
async def list_decks(
    status: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    conditions = []
    params = []
    if status:
        conditions.append("status = ?")
        params.append(status)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    async with db.execute(
        f"SELECT * FROM decks {where} ORDER BY updated_at DESC", params
    ) as cursor:
        rows = await cursor.fetchall()

    decks = []
    for row in rows:
        d = dict(row)
        if d.get("colors") and isinstance(d["colors"], str):
            try:
                d["colors"] = json.loads(d["colors"])
            except Exception:
                d["colors"] = []
        # Card counts
        async with db.execute(
            "SELECT SUM(quantity) as cnt FROM deck_entries WHERE deck_id = ? AND board = 'main'",
            (d["id"],),
        ) as c:
            r = await c.fetchone()
            d["card_count"] = r["cnt"] or 0
        async with db.execute(
            """SELECT SUM(de.quantity) as cnt FROM deck_entries de
               WHERE de.deck_id = ? AND board = 'main' AND de.collection_entry_id IS NULL""",
            (d["id"],),
        ) as c:
            r = await c.fetchone()
            d["missing_count"] = r["cnt"] or 0
        decks.append(d)

    return {"data": decks}


@router.post("", status_code=201)
async def create_deck(deck: DeckCreate, db: aiosqlite.Connection = Depends(get_db)):
    colors_json = json.dumps(deck.colors) if deck.colors else None
    async with db.execute(
        """INSERT INTO decks (name, format, status, description, colors)
           VALUES (?, ?, ?, ?, ?)""",
        (deck.name, deck.format, deck.status, deck.description, colors_json),
    ) as cursor:
        new_id = cursor.lastrowid
    await db.commit()
    return await get_deck_with_counts(db, new_id)


@router.get("/{deck_id}")
async def get_deck(deck_id: int, db: aiosqlite.Connection = Depends(get_db)):
    deck = await get_deck_with_counts(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.patch("/{deck_id}")
async def update_deck(
    deck_id: int, update: DeckUpdate, db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")

    fields = update.model_dump(exclude_none=True)
    if "colors" in fields:
        fields["colors"] = json.dumps(fields["colors"])
    if not fields:
        return await get_deck_with_counts(db, deck_id)

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [deck_id]
    await db.execute(
        f"UPDATE decks SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        values,
    )
    await db.commit()
    return await get_deck_with_counts(db, deck_id)


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(deck_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")
    await db.execute("DELETE FROM decks WHERE id = ?", (deck_id,))
    await db.commit()


@router.get("/{deck_id}/entries")
async def get_deck_entries(
    deck_id: int,
    board: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")

    conditions = ["de.deck_id = ?"]
    params = [deck_id]
    if board:
        conditions.append("de.board = ?")
        params.append(board)

    where = "WHERE " + " AND ".join(conditions)
    async with db.execute(
        f"""SELECT de.id, de.deck_id, de.scryfall_id, de.quantity,
                   de.collection_entry_id, de.is_commander, de.is_sideboard, de.board,
                   sc.name, sc.set_code, sc.set_name, sc.collector_number,
                   sc.image_uri_normal, sc.image_uri_small, sc.image_uri_art_crop,
                   sc.colors, sc.color_identity, sc.type_line, sc.oracle_text,
                   sc.cmc, sc.power, sc.toughness, sc.rarity,
                   sc.price_usd, sc.price_eur, sc.price_usd_foil, sc.price_eur_foil,
                   sc.keywords, sc.layout, sc.mana_cost,
                   ce.foil as ce_foil, ce.language as ce_language, ce.is_proxy,
                   l.name as location_name, l.type as location_type
            FROM deck_entries de
            JOIN scryfall_cards sc ON de.scryfall_id = sc.id
            LEFT JOIN collection_entries ce ON de.collection_entry_id = ce.id
            LEFT JOIN locations l ON ce.location_id = l.id
            {where}
            ORDER BY de.is_commander DESC, sc.type_line, sc.name""",
        params,
    ) as cursor:
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

    return {"data": entries}


@router.post("/{deck_id}/entries", status_code=201)
async def add_deck_entry(
    deck_id: int,
    entry: DeckEntryCreate,
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")

    # Ensure card is cached
    async with db.execute(
        "SELECT id FROM scryfall_cards WHERE id = ?", (entry.scryfall_id,)
    ) as cursor:
        if not await cursor.fetchone():
            card_data = await scryfall.get_card_by_id(entry.scryfall_id)
            if not card_data:
                raise HTTPException(status_code=404, detail="Card not found")
            await cache_card(db, card_data)

    # Check if already in deck on same board
    async with db.execute(
        "SELECT id, quantity FROM deck_entries WHERE deck_id = ? AND scryfall_id = ? AND board = ?",
        (deck_id, entry.scryfall_id, entry.board),
    ) as cursor:
        existing = await cursor.fetchone()

    if existing:
        new_qty = existing["quantity"] + entry.quantity
        await db.execute(
            "UPDATE deck_entries SET quantity = ? WHERE id = ?",
            (new_qty, existing["id"]),
        )
        await db.commit()
        entry_id = existing["id"]
    else:
        async with db.execute(
            """INSERT INTO deck_entries (deck_id, scryfall_id, quantity, collection_entry_id,
               is_commander, is_sideboard, board)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (deck_id, entry.scryfall_id, entry.quantity, entry.collection_entry_id,
             entry.is_commander, entry.is_sideboard, entry.board),
        ) as cursor:
            entry_id = cursor.lastrowid
        await db.commit()

    await db.execute(
        "UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (deck_id,)
    )
    await db.commit()

    async with db.execute(
        """SELECT de.*, sc.name, sc.type_line, sc.cmc, sc.colors, sc.color_identity,
                  sc.image_uri_normal, sc.image_uri_small
           FROM deck_entries de
           JOIN scryfall_cards sc ON de.scryfall_id = sc.id
           WHERE de.id = ?""",
        (entry_id,),
    ) as cursor:
        row = await cursor.fetchone()
    d = dict(row)
    for field in ["colors", "color_identity"]:
        if d.get(field) and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = []
    return d


@router.patch("/{deck_id}/entries/{entry_id}")
async def update_deck_entry(
    deck_id: int,
    entry_id: int,
    update: DeckEntryUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT id FROM deck_entries WHERE id = ? AND deck_id = ?", (entry_id, deck_id)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck entry not found")

    fields = update.model_dump(exclude_none=True)
    if not fields:
        pass
    else:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [entry_id]
        await db.execute(
            f"UPDATE deck_entries SET {set_clause} WHERE id = ?", values
        )
        await db.execute(
            "UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (deck_id,)
        )
        await db.commit()

    async with db.execute(
        "SELECT * FROM deck_entries WHERE id = ?", (entry_id,)
    ) as cursor:
        row = await cursor.fetchone()
    return dict(row)


@router.delete("/{deck_id}/entries/{entry_id}", status_code=204)
async def delete_deck_entry(
    deck_id: int, entry_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute(
        "SELECT id FROM deck_entries WHERE id = ? AND deck_id = ?", (entry_id, deck_id)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck entry not found")
    await db.execute("DELETE FROM deck_entries WHERE id = ?", (entry_id,))
    await db.commit()


@router.get("/{deck_id}/analysis")
async def deck_analysis(deck_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")

    async with db.execute(
        """SELECT sc.cmc, sc.type_line, sc.colors, sc.color_identity,
                  sc.keywords, de.quantity, de.board
           FROM deck_entries de
           JOIN scryfall_cards sc ON de.scryfall_id = sc.id
           WHERE de.deck_id = ? AND de.board = 'main'""",
        (deck_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    mana_curve = {}
    type_breakdown = {}
    color_distribution = {}

    for row in rows:
        qty = row["quantity"]
        cmc = int(row["cmc"] or 0)
        if cmc > 7:
            cmc = 7  # bucket 7+
        mana_curve[str(cmc)] = mana_curve.get(str(cmc), 0) + qty

        type_line = row["type_line"] or ""
        tl = type_line.lower()
        category = "Other"
        for t in ["Creature", "Planeswalker", "Instant", "Sorcery", "Enchantment", "Artifact", "Land"]:
            if t.lower() in tl:
                category = t
                break
        type_breakdown[category] = type_breakdown.get(category, 0) + qty

        try:
            ci = json.loads(row["color_identity"]) if isinstance(row["color_identity"], str) else (row["color_identity"] or [])
        except Exception:
            ci = []
        for c in ci:
            color_distribution[c] = color_distribution.get(c, 0) + qty
        if not ci:
            color_distribution["C"] = color_distribution.get("C", 0) + qty

    return {
        "mana_curve": mana_curve,
        "type_breakdown": type_breakdown,
        "color_distribution": color_distribution,
    }


@router.get("/{deck_id}/missing")
async def deck_missing_cards(deck_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id FROM decks WHERE id = ?", (deck_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Deck not found")

    async with db.execute(
        """SELECT de.id, de.scryfall_id, de.quantity,
                  sc.name, sc.set_code, sc.image_uri_small, sc.image_uri_normal,
                  sc.type_line, sc.cmc, sc.colors, sc.color_identity,
                  sc.price_usd, sc.price_eur, sc.keywords, sc.oracle_text
           FROM deck_entries de
           JOIN scryfall_cards sc ON de.scryfall_id = sc.id
           WHERE de.deck_id = ? AND de.board = 'main' AND de.collection_entry_id IS NULL""",
        (deck_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    missing = []
    for row in rows:
        d = dict(row)
        for field in ["colors", "color_identity", "keywords"]:
            if d.get(field) and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except Exception:
                    d[field] = []

        similar = await similarity.find_similar_in_collection(d, db, limit=3)
        similar_cards = []
        for s in similar:
            card_d = dict(s["card"])
            for field in ["colors", "color_identity", "keywords"]:
                if card_d.get(field) and isinstance(card_d[field], str):
                    try:
                        card_d[field] = json.loads(card_d[field])
                    except Exception:
                        card_d[field] = []
            similar_cards.append({"score": s["score"], **card_d})
        d["similar_in_collection"] = similar_cards
        missing.append(d)

    return {"data": missing}


@router.get("/{deck_id}/refile")
async def deck_refile_guide(deck_id: int, db: aiosqlite.Connection = Depends(get_db)):
    """When dismantling a deck, show where each card should be re-filed."""
    async with db.execute(
        """SELECT de.scryfall_id, de.quantity,
                  sc.name, sc.image_uri_small,
                  ce.location_id, l.name as location_name
           FROM deck_entries de
           JOIN scryfall_cards sc ON de.scryfall_id = sc.id
           LEFT JOIN collection_entries ce ON de.collection_entry_id = ce.id
           LEFT JOIN locations l ON ce.location_id = l.id
           WHERE de.deck_id = ?""",
        (deck_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    return {"data": [dict(r) for r in rows]}
