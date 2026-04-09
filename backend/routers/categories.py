from fastapi import APIRouter, Depends, HTTPException
from aiosqlite import Connection
from database import get_db
from models import Category, CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[Category])
async def list_categories(db: Connection = Depends(get_db)):
    async with db.execute("SELECT * FROM categories ORDER BY is_income, sort_order, name") as cur:
        rows = await cur.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["is_income"] = bool(d["is_income"])
        result.append(d)
    return result


@router.post("", response_model=Category, status_code=201)
async def create_category(body: CategoryCreate, db: Connection = Depends(get_db)):
    async with db.execute(
        """INSERT INTO categories (name, icon, color, is_income, sort_order)
           VALUES (?,?,?,?,?) RETURNING *""",
        (body.name, body.icon, body.color, int(body.is_income), body.sort_order),
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    d = dict(row)
    d["is_income"] = bool(d["is_income"])
    return d


@router.put("/{cat_id}", response_model=Category)
async def update_category(cat_id: int, body: CategoryUpdate, db: Connection = Depends(get_db)):
    fields, vals = [], []
    for attr in ("name", "icon", "color", "sort_order"):
        val = getattr(body, attr)
        if val is not None:
            fields.append(f"{attr}=?"); vals.append(val)
    if body.is_income is not None:
        fields.append("is_income=?"); vals.append(int(body.is_income))
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(cat_id)
    async with db.execute(
        f"UPDATE categories SET {','.join(fields)} WHERE id=? RETURNING *", vals
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Category not found")
    await db.commit()
    d = dict(row)
    d["is_income"] = bool(d["is_income"])
    return d


@router.delete("/{cat_id}", status_code=204)
async def delete_category(cat_id: int, db: Connection = Depends(get_db)):
    # Only allow deleting custom categories (id > 18)
    if cat_id <= 18:
        raise HTTPException(400, "Cannot delete default categories")
    await db.execute("DELETE FROM categories WHERE id=?", (cat_id,))
    await db.commit()
