from fastapi import APIRouter, Depends, Query
from aiosqlite import Connection
from typing import Optional
from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Connection = Depends(get_db),
):
    """Total income, expenses, balance for a period."""
    where, vals = ["e.is_income=?"], [0]
    if year:
        where.append("strftime('%Y', e.date)=?"); vals.append(str(year))
    if month:
        where.append("strftime('%m', e.date)=?"); vals.append(f"{month:02d}")

    async with db.execute(
        f"SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE {' AND '.join(where)}", vals
    ) as cur:
        exp_row = await cur.fetchone()

    vals[0] = 1
    async with db.execute(
        f"SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE {' AND '.join(where)}", vals
    ) as cur:
        inc_row = await cur.fetchone()

    total_expenses = exp_row["total"]
    total_income = inc_row["total"]

    return {
        "total_expenses": total_expenses,
        "total_income": total_income,
        "balance": total_income - total_expenses,
    }


@router.get("/by-category")
async def by_category(
    year: Optional[int] = None,
    month: Optional[int] = None,
    is_income: bool = False,
    db: Connection = Depends(get_db),
):
    where = ["e.is_income=?"]
    vals = [int(is_income)]
    if year:
        where.append("strftime('%Y', e.date)=?"); vals.append(str(year))
    if month:
        where.append("strftime('%m', e.date)=?"); vals.append(f"{month:02d}")

    async with db.execute(
        f"""SELECT c.id, c.name, c.icon, c.color,
                   COALESCE(SUM(e.amount),0) as total,
                   COUNT(e.id) as count
            FROM categories c
            LEFT JOIN expenses e ON e.category_id = c.id AND {' AND '.join(where)}
            WHERE c.is_income=?
            GROUP BY c.id
            ORDER BY total DESC""",
        vals + [int(is_income)],
    ) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/monthly")
async def monthly(
    year: int = Query(...),
    db: Connection = Depends(get_db),
):
    """Expenses and income per month for a given year."""
    result = []
    for m in range(1, 13):
        m_str = f"{m:02d}"
        async with db.execute(
            """SELECT COALESCE(SUM(amount),0) as total FROM expenses
               WHERE is_income=0 AND strftime('%Y',date)=? AND strftime('%m',date)=?""",
            (str(year), m_str),
        ) as cur:
            exp = (await cur.fetchone())["total"]
        async with db.execute(
            """SELECT COALESCE(SUM(amount),0) as total FROM expenses
               WHERE is_income=1 AND strftime('%Y',date)=? AND strftime('%m',date)=?""",
            (str(year), m_str),
        ) as cur:
            inc = (await cur.fetchone())["total"]
        result.append({"month": m, "expenses": exp, "income": inc, "balance": inc - exp})
    return result


@router.get("/by-user")
async def by_user(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Connection = Depends(get_db),
):
    """How much each user paid."""
    where = ["e.is_income=0"]
    vals = []
    if year:
        where.append("strftime('%Y', e.date)=?"); vals.append(str(year))
    if month:
        where.append("strftime('%m', e.date)=?"); vals.append(f"{month:02d}")

    async with db.execute(
        f"""SELECT u.id, u.name, u.color, u.emoji,
                   COALESCE(SUM(e.amount),0) as paid,
                   COUNT(e.id) as count
            FROM users u
            LEFT JOIN expenses e ON e.paid_by = u.id AND {' AND '.join(where)}
            GROUP BY u.id
            ORDER BY paid DESC""",
        vals,
    ) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/balances")
async def balances(db: Connection = Depends(get_db)):
    """Compute who owes who based on unsettled splits."""
    # For each user: what they paid vs what was split to them (unsettled)
    async with db.execute(
        """SELECT u.id, u.name, u.color, u.emoji,
                  COALESCE(SUM(CASE WHEN e.paid_by=u.id AND e.is_income=0 THEN e.amount ELSE 0 END),0) as total_paid,
                  COALESCE(SUM(CASE WHEN es.user_id=u.id AND es.is_settled=0 THEN es.amount ELSE 0 END),0) as owed_to_me
           FROM users u
           LEFT JOIN expenses e ON e.paid_by=u.id
           LEFT JOIN expense_splits es ON es.user_id=u.id
           GROUP BY u.id""",
    ) as cur:
        rows = await cur.fetchall()

    users = [dict(r) for r in rows]

    # Simple pairwise balance from splits
    async with db.execute(
        """SELECT es.user_id as debtor, e.paid_by as creditor,
                  SUM(es.amount) as amount
           FROM expense_splits es
           JOIN expenses e ON e.id = es.expense_id
           WHERE es.is_settled=0 AND e.is_income=0 AND es.user_id != e.paid_by
           GROUP BY es.user_id, e.paid_by""",
    ) as cur:
        split_rows = await cur.fetchall()

    debts = [dict(r) for r in split_rows]

    return {"users": users, "debts": debts}


@router.get("/weekly")
async def weekly(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Connection = Depends(get_db),
):
    """Expenses grouped by week number within a month."""
    where = ["is_income=0"]
    vals = []
    if year:
        where.append("strftime('%Y',date)=?"); vals.append(str(year))
    if month:
        where.append("strftime('%m',date)=?"); vals.append(f"{month:02d}")

    async with db.execute(
        f"""SELECT strftime('%W',date) as week,
                   COALESCE(SUM(amount),0) as total,
                   COUNT(*) as count
            FROM expenses WHERE {' AND '.join(where)}
            GROUP BY week ORDER BY week""",
        vals,
    ) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]
