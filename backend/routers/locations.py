from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from database import get_db
from models import LocationCreate

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("")
async def list_locations(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT * FROM locations ORDER BY sort_order ASC, name ASC"
    ) as cursor:
        rows = await cursor.fetchall()
    return {"data": [dict(r) for r in rows]}


@router.post("", status_code=201)
async def create_location(loc: LocationCreate, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        """INSERT INTO locations (name, type, color, set_code, person, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (loc.name, loc.type, loc.color, loc.set_code, loc.person, loc.sort_order),
    ) as cursor:
        new_id = cursor.lastrowid
    await db.commit()
    async with db.execute("SELECT * FROM locations WHERE id = ?", (new_id,)) as cursor:
        row = await cursor.fetchone()
    return dict(row)


@router.patch("/{location_id}")
async def update_location(
    location_id: int, loc: LocationCreate, db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute("SELECT id FROM locations WHERE id = ?", (location_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Location not found")
    await db.execute(
        """UPDATE locations SET name=?, type=?, color=?, set_code=?, person=?, sort_order=?
           WHERE id=?""",
        (loc.name, loc.type, loc.color, loc.set_code, loc.person, loc.sort_order, location_id),
    )
    await db.commit()
    async with db.execute("SELECT * FROM locations WHERE id = ?", (location_id,)) as cursor:
        row = await cursor.fetchone()
    return dict(row)


@router.delete("/{location_id}", status_code=204)
async def delete_location(location_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT id FROM locations WHERE id = ?", (location_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Location not found")
    await db.execute("DELETE FROM locations WHERE id = ?", (location_id,))
    await db.commit()
