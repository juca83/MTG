from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import aiosqlite
import csv
import io
import json
from typing import Optional

from database import get_db
from services import scryfall
from routers.cards import cache_card

router = APIRouter(prefix="/api/import", tags=["import"])

# Manabox category -> location name mapping
MANABOX_LOCATION_MAP = {
    "staples": None,  # Needs color routing
    "legendaries": None,  # Needs legendary routing
    "bulks": "Rangement Bulk",
    "for trades": "À échanger",
    "lent to arthur": "Prêté à Arthur",
    "lend from arthur": "Emprunté d'Arthur",
    "borrowed": "Emprunté d'Arthur",
}


async def get_location_id(db, name: str) -> Optional[int]:
    async with db.execute(
        "SELECT id FROM locations WHERE name = ?", (name,)
    ) as cursor:
        row = await cursor.fetchone()
        return row["id"] if row else None


async def get_staple_location(db, color_identity: list) -> Optional[int]:
    """Route to appropriate staple binder based on color identity."""
    if not color_identity:
        return await get_location_id(db, "Staples Incolore")
    if len(color_identity) > 1:
        return await get_location_id(db, "Staples Multicolor")
    color_map = {
        "W": "Staples Blanc",
        "U": "Staples Bleu",
        "G": "Staples Vert",
        "B": "Staples Noir",
        "R": "Staples Rouge",
    }
    loc_name = color_map.get(color_identity[0], "Staples Incolore")
    return await get_location_id(db, loc_name)


@router.post("/manabox")
async def import_manabox_csv(
    file: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Import a Manabox CSV export.
    Expected columns: Name, Set code, Collector number, Foil, Language, Quantity, Purchase price, Category
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty")

    imported = 0
    skipped = 0
    errors = []

    # Get all locations upfront
    async with db.execute("SELECT * FROM locations") as cursor:
        all_locations = {r["name"]: r["id"] for r in await cursor.fetchall()}

    for i, row in enumerate(rows):
        try:
            # Normalize column names (Manabox uses various formats)
            name = row.get("Name") or row.get("name") or ""
            set_code = (row.get("Set code") or row.get("set_code") or row.get("Set") or "").lower()
            collector_number = row.get("Collector number") or row.get("collector_number") or ""
            foil_str = (row.get("Foil") or row.get("foil") or "").lower()
            foil = foil_str in ("true", "yes", "foil", "1")
            language = row.get("Language") or row.get("language") or "en"
            quantity = int(row.get("Quantity") or row.get("quantity") or 1)
            category = (row.get("Category") or row.get("category") or "").lower().strip()
            is_proxy = "proxy" in category

            if not name:
                skipped += 1
                continue

            # Find or fetch card
            card_data = None
            if set_code and collector_number:
                try:
                    async with aiosqlite.connect(db._connection) as _:
                        pass
                except Exception:
                    pass
                # Try to find in cache by name and set
                async with db.execute(
                    "SELECT id, color_identity FROM scryfall_cards WHERE set_code = ? AND collector_number = ?",
                    (set_code, collector_number),
                ) as cursor:
                    cached = await cursor.fetchone()
                if cached:
                    card_id = cached["id"]
                    color_identity_raw = cached["color_identity"]
                    try:
                        color_identity = json.loads(color_identity_raw) if color_identity_raw else []
                    except Exception:
                        color_identity = []
                else:
                    # Fetch from Scryfall
                    try:
                        card_data = await scryfall.get_card_by_set_number(set_code, collector_number)
                        if card_data:
                            await cache_card(db, card_data)
                            card_id = card_data["id"]
                            color_identity = card_data.get("color_identity", [])
                        else:
                            skipped += 1
                            errors.append(f"Row {i+1}: Card not found: {name} ({set_code} #{collector_number})")
                            continue
                    except Exception as e:
                        skipped += 1
                        errors.append(f"Row {i+1}: Error fetching {name}: {str(e)}")
                        continue
            else:
                # Search by name
                async with db.execute(
                    "SELECT id, color_identity FROM scryfall_cards WHERE name = ?", (name,)
                ) as cursor:
                    cached = await cursor.fetchone()
                if cached:
                    card_id = cached["id"]
                    try:
                        color_identity = json.loads(cached["color_identity"] or "[]")
                    except Exception:
                        color_identity = []
                else:
                    try:
                        card_data = await scryfall.get_card_by_name(name, set_code or None)
                        if card_data:
                            await cache_card(db, card_data)
                            card_id = card_data["id"]
                            color_identity = card_data.get("color_identity", [])
                        else:
                            skipped += 1
                            errors.append(f"Row {i+1}: Card not found: {name}")
                            continue
                    except Exception as e:
                        skipped += 1
                        errors.append(f"Row {i+1}: Error: {str(e)}")
                        continue

            # Determine location
            location_id = None
            if is_proxy:
                location_id = all_locations.get("À trier")
            elif "staple" in category:
                location_id = await get_staple_location(db, color_identity)
            elif "legendar" in category or "légendaire" in category:
                if len(color_identity) > 1:
                    location_id = all_locations.get("Légendaires Multi")
                else:
                    location_id = all_locations.get("Légendaires Mono")
            elif "bulk" in category:
                location_id = all_locations.get("Rangement Bulk")
            elif "trade" in category or "échange" in category:
                location_id = all_locations.get("À échanger")
            elif "lent" in category or "prêt" in category:
                location_id = all_locations.get("Prêté à Arthur")
            elif "borrow" in category or "emprunté" in category:
                location_id = all_locations.get("Emprunté d'Arthur")
            else:
                location_id = all_locations.get("À trier")

            # Upsert collection entry
            async with db.execute(
                """SELECT id, quantity FROM collection_entries
                   WHERE scryfall_id = ? AND foil = ? AND language = ?
                   AND location_id IS ? AND is_proxy = ?""",
                (card_id, foil, language, location_id, is_proxy),
            ) as cursor:
                existing = await cursor.fetchone()

            if existing:
                await db.execute(
                    "UPDATE collection_entries SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (quantity, existing["id"]),
                )
            else:
                await db.execute(
                    """INSERT INTO collection_entries (scryfall_id, quantity, foil, language, location_id, is_proxy)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (card_id, quantity, foil, language, location_id, is_proxy),
                )

            imported += 1

            if imported % 50 == 0:
                await db.commit()

        except Exception as e:
            skipped += 1
            errors.append(f"Row {i+1}: Unexpected error: {str(e)}")

    await db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # Limit error list
        "total_rows": len(rows),
    }
