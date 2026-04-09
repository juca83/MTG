import aiosqlite
import os
from pathlib import Path

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent / "expenses.db"))

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    emoji TEXT NOT NULL DEFAULT '👤',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('common','personal')),
    owner_id INTEGER REFERENCES users(id),
    color TEXT NOT NULL DEFAULT '#10b981',
    icon TEXT NOT NULL DEFAULT '🏦',
    initial_balance REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '💰',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_income INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    paid_by INTEGER NOT NULL REFERENCES users(id),
    account_id INTEGER REFERENCES accounts(id),
    category_id INTEGER REFERENCES categories(id),
    notes TEXT,
    is_income INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    is_settled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    amount REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, month, year, user_id)
);

INSERT OR IGNORE INTO categories (id, name, icon, color, is_income, sort_order) VALUES
    (1,  'Loyer / Logement',  '🏠', '#ef4444', 0,  1),
    (2,  'Courses',           '🛒', '#f97316', 0,  2),
    (3,  'Restaurant',        '🍽️', '#f59e0b', 0,  3),
    (4,  'Bar / Verre',       '🍺', '#eab308', 0,  4),
    (5,  'Transport',         '🚌', '#84cc16', 0,  5),
    (6,  'Voiture',           '🚗', '#22c55e', 0,  6),
    (7,  'Santé',             '🏥', '#10b981', 0,  7),
    (8,  'Shopping',          '🛍️', '#14b8a6', 0,  8),
    (9,  'Abonnements',       '📱', '#06b6d4', 0,  9),
    (10, 'Loisirs',           '🎮', '#3b82f6', 0, 10),
    (11, 'Voyages',           '✈️', '#6366f1', 0, 11),
    (12, 'Cadeaux',           '🎁', '#8b5cf6', 0, 12),
    (13, 'Investissements',   '📈', '#a855f7', 0, 13),
    (14, 'Épargne',           '🐷', '#ec4899', 0, 14),
    (15, 'Divers',            '📦', '#6b7280', 0, 15),
    (16, 'Salaire',           '💼', '#10b981', 1,  1),
    (17, 'Remboursement',     '💳', '#3b82f6', 1,  2),
    (18, 'Autre revenu',      '💰', '#6366f1', 1,  3);
"""


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript(SCHEMA)
        await db.commit()
