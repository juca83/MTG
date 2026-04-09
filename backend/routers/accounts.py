from fastapi import APIRouter, Depends, HTTPException
from aiosqlite import Connection
from database import get_db
from models import Account, AccountCreate, AccountUpdate

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

QUERY = """
    SELECT a.*, u.name as owner_name
    FROM accounts a
    LEFT JOIN users u ON u.id = a.owner_id
"""


@router.get("", response_model=list[Account])
async def list_accounts(db: Connection = Depends(get_db)):
    async with db.execute(QUERY + " ORDER BY a.id") as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("", response_model=Account, status_code=201)
async def create_account(body: AccountCreate, db: Connection = Depends(get_db)):
    async with db.execute(
        """INSERT INTO accounts (name, type, owner_id, color, icon, initial_balance)
           VALUES (?,?,?,?,?,?) RETURNING id""",
        (body.name, body.type, body.owner_id, body.color, body.icon, body.initial_balance),
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    async with db.execute(QUERY + " WHERE a.id=?", (row["id"],)) as cur:
        return dict(await cur.fetchone())


@router.put("/{account_id}", response_model=Account)
async def update_account(account_id: int, body: AccountUpdate, db: Connection = Depends(get_db)):
    fields, vals = [], []
    for attr in ("name", "type", "owner_id", "color", "icon", "initial_balance"):
        val = getattr(body, attr)
        if val is not None:
            fields.append(f"{attr}=?"); vals.append(val)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(account_id)
    await db.execute(f"UPDATE accounts SET {','.join(fields)} WHERE id=?", vals)
    await db.commit()
    async with db.execute(QUERY + " WHERE a.id=?", (account_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Account not found")
    return dict(row)


@router.delete("/{account_id}", status_code=204)
async def delete_account(account_id: int, db: Connection = Depends(get_db)):
    await db.execute("DELETE FROM accounts WHERE id=?", (account_id,))
    await db.commit()
