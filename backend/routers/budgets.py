from fastapi import APIRouter, Depends, HTTPException, Query
from aiosqlite import Connection
from typing import Optional
from database import get_db
from models import Budget, BudgetCreate, BudgetUpdate

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

QUERY = """
    SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM budgets b
    LEFT JOIN categories c ON c.id = b.category_id
"""


async def _add_spent(db, budgets: list, year: int, month: int) -> list:
    for b in budgets:
        where = ["e.is_income=0", "strftime('%Y',e.date)=?", "strftime('%m',e.date)=?"]
        vals = [str(year), f"{month:02d}"]
        if b.get("category_id"):
            where.append("e.category_id=?"); vals.append(b["category_id"])
        async with db.execute(
            f"SELECT COALESCE(SUM(e.amount),0) as spent FROM expenses e WHERE {' AND '.join(where)}",
            vals,
        ) as cur:
            row = await cur.fetchone()
        b["spent"] = row["spent"]
    return budgets


@router.get("", response_model=list[Budget])
async def list_budgets(
    month: int = Query(...),
    year: int = Query(...),
    db: Connection = Depends(get_db),
):
    async with db.execute(
        QUERY + " WHERE b.month=? AND b.year=? ORDER BY b.id", (month, year)
    ) as cur:
        rows = await cur.fetchall()
    budgets = [dict(r) for r in rows]
    budgets = await _add_spent(db, budgets, year, month)
    return budgets


@router.post("", response_model=Budget, status_code=201)
async def create_budget(body: BudgetCreate, db: Connection = Depends(get_db)):
    try:
        async with db.execute(
            """INSERT INTO budgets (category_id, amount, month, year, user_id)
               VALUES (?,?,?,?,?) RETURNING id""",
            (body.category_id, body.amount, body.month, body.year, body.user_id),
        ) as cur:
            row = await cur.fetchone()
        await db.commit()
        budget_id = row["id"]
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Budget already exists for this category/month/year")
        raise
    async with db.execute(QUERY + " WHERE b.id=?", (budget_id,)) as cur:
        full = await cur.fetchone()
    result = dict(full)
    result["spent"] = 0.0
    return result


@router.put("/{budget_id}", response_model=Budget)
async def update_budget(budget_id: int, body: BudgetUpdate, db: Connection = Depends(get_db)):
    if body.amount is None:
        raise HTTPException(400, "Nothing to update")
    async with db.execute(
        "UPDATE budgets SET amount=? WHERE id=? RETURNING month, year", (body.amount, budget_id)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Budget not found")
    await db.commit()
    month, year = row["month"], row["year"]
    async with db.execute(QUERY + " WHERE b.id=?", (budget_id,)) as cur:
        full = await cur.fetchone()
    result = dict(full)
    budgets = await _add_spent(db, [result], year, month)
    return budgets[0]


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(budget_id: int, db: Connection = Depends(get_db)):
    await db.execute("DELETE FROM budgets WHERE id=?", (budget_id,))
    await db.commit()
