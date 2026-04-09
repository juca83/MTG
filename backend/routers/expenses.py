from fastapi import APIRouter, Depends, HTTPException, Query
from aiosqlite import Connection
from typing import Optional
from database import get_db
from models import Expense, ExpenseCreate, ExpenseUpdate, Split

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

EXPENSE_QUERY = """
    SELECT
        e.*,
        u.name  as paid_by_name,
        u.color as paid_by_color,
        u.emoji as paid_by_emoji,
        c.name  as category_name,
        c.icon  as category_icon,
        c.color as category_color,
        a.name  as account_name
    FROM expenses e
    LEFT JOIN users u    ON u.id = e.paid_by
    LEFT JOIN categories c ON c.id = e.category_id
    LEFT JOIN accounts a  ON a.id = e.account_id
"""


async def _fetch_splits(db, expense_id: int):
    async with db.execute(
        """SELECT es.*, u.name as user_name, u.color as user_color, u.emoji as user_emoji
           FROM expense_splits es
           JOIN users u ON u.id = es.user_id
           WHERE es.expense_id = ?""",
        (expense_id,),
    ) as cur:
        rows = await cur.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["is_settled"] = bool(d["is_settled"])
        result.append(d)
    return result


def _row_to_expense(row) -> dict:
    d = dict(row)
    d["is_income"] = bool(d["is_income"])
    d["splits"] = []
    return d


@router.get("", response_model=list[Expense])
async def list_expenses(
    limit: int = Query(100, le=500),
    offset: int = 0,
    year: Optional[int] = None,
    month: Optional[int] = None,
    category_id: Optional[int] = None,
    paid_by: Optional[int] = None,
    account_id: Optional[int] = None,
    is_income: Optional[bool] = None,
    db: Connection = Depends(get_db),
):
    where, vals = [], []
    if year:
        where.append("strftime('%Y', e.date) = ?"); vals.append(str(year))
    if month:
        where.append("strftime('%m', e.date) = ?"); vals.append(f"{month:02d}")
    if category_id is not None:
        where.append("e.category_id = ?"); vals.append(category_id)
    if paid_by is not None:
        where.append("e.paid_by = ?"); vals.append(paid_by)
    if account_id is not None:
        where.append("e.account_id = ?"); vals.append(account_id)
    if is_income is not None:
        where.append("e.is_income = ?"); vals.append(int(is_income))

    sql = EXPENSE_QUERY
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY e.date DESC, e.id DESC LIMIT ? OFFSET ?"
    vals += [limit, offset]

    async with db.execute(sql, vals) as cur:
        rows = await cur.fetchall()

    result = []
    for row in rows:
        expense = _row_to_expense(row)
        expense["splits"] = await _fetch_splits(db, expense["id"])
        result.append(expense)
    return result


@router.get("/{expense_id}", response_model=Expense)
async def get_expense(expense_id: int, db: Connection = Depends(get_db)):
    async with db.execute(EXPENSE_QUERY + " WHERE e.id=?", (expense_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Expense not found")
    expense = _row_to_expense(row)
    expense["splits"] = await _fetch_splits(db, expense_id)
    return expense


@router.post("", response_model=Expense, status_code=201)
async def create_expense(body: ExpenseCreate, db: Connection = Depends(get_db)):
    async with db.execute(
        """INSERT INTO expenses (amount, description, date, paid_by, account_id,
           category_id, notes, is_income) VALUES (?,?,?,?,?,?,?,?) RETURNING id""",
        (body.amount, body.description, body.date, body.paid_by,
         body.account_id, body.category_id, body.notes, int(body.is_income)),
    ) as cur:
        row = await cur.fetchone()
    expense_id = row["id"]

    for split in body.splits:
        await db.execute(
            "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?,?,?)",
            (expense_id, split.user_id, split.amount),
        )
    await db.commit()

    async with db.execute(EXPENSE_QUERY + " WHERE e.id=?", (expense_id,)) as cur:
        full_row = await cur.fetchone()
    expense = _row_to_expense(full_row)
    expense["splits"] = await _fetch_splits(db, expense_id)
    return expense


@router.put("/{expense_id}", response_model=Expense)
async def update_expense(expense_id: int, body: ExpenseUpdate, db: Connection = Depends(get_db)):
    fields, vals = [], []
    for attr in ("amount", "description", "date", "paid_by", "account_id", "category_id", "notes"):
        val = getattr(body, attr)
        if val is not None:
            fields.append(f"{attr}=?"); vals.append(val)
    if body.is_income is not None:
        fields.append("is_income=?"); vals.append(int(body.is_income))

    if fields:
        vals.append(expense_id)
        await db.execute(f"UPDATE expenses SET {','.join(fields)} WHERE id=?", vals)

    if body.splits is not None:
        await db.execute("DELETE FROM expense_splits WHERE expense_id=?", (expense_id,))
        for split in body.splits:
            await db.execute(
                "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?,?,?)",
                (expense_id, split.user_id, split.amount),
            )
    await db.commit()

    async with db.execute(EXPENSE_QUERY + " WHERE e.id=?", (expense_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Expense not found")
    expense = _row_to_expense(row)
    expense["splits"] = await _fetch_splits(db, expense_id)
    return expense


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: int, db: Connection = Depends(get_db)):
    await db.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
    await db.commit()


@router.patch("/{expense_id}/splits/{split_id}/settle", response_model=dict)
async def settle_split(expense_id: int, split_id: int, db: Connection = Depends(get_db)):
    await db.execute(
        "UPDATE expense_splits SET is_settled=1 WHERE id=? AND expense_id=?",
        (split_id, expense_id),
    )
    await db.commit()
    return {"ok": True}
