from fastapi import APIRouter, Depends, HTTPException
from aiosqlite import Connection
from database import get_db
from models import User, UserCreate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[User])
async def list_users(db: Connection = Depends(get_db)):
    async with db.execute("SELECT * FROM users ORDER BY id") as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("", response_model=User, status_code=201)
async def create_user(body: UserCreate, db: Connection = Depends(get_db)):
    async with db.execute(
        "INSERT INTO users (name, color, emoji) VALUES (?,?,?) RETURNING *",
        (body.name, body.color, body.emoji),
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    return dict(row)


@router.put("/{user_id}", response_model=User)
async def update_user(user_id: int, body: UserUpdate, db: Connection = Depends(get_db)):
    fields, vals = [], []
    if body.name is not None:
        fields.append("name=?"); vals.append(body.name)
    if body.color is not None:
        fields.append("color=?"); vals.append(body.color)
    if body.emoji is not None:
        fields.append("emoji=?"); vals.append(body.emoji)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(user_id)
    async with db.execute(
        f"UPDATE users SET {','.join(fields)} WHERE id=? RETURNING *", vals
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "User not found")
    await db.commit()
    return dict(row)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: Connection = Depends(get_db)):
    await db.execute("DELETE FROM users WHERE id=?", (user_id,))
    await db.commit()
