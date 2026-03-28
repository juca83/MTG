import aiosqlite
import os
import json
from pathlib import Path

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent / "mtg.db"))

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS scryfall_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_code TEXT NOT NULL,
    set_name TEXT NOT NULL,
    collector_number TEXT,
    image_uri_normal TEXT,
    image_uri_small TEXT,
    image_uri_art_crop TEXT,
    colors TEXT,
    color_identity TEXT,
    type_line TEXT,
    oracle_text TEXT,
    cmc REAL,
    power TEXT,
    toughness TEXT,
    rarity TEXT,
    price_usd REAL,
    price_eur REAL,
    price_usd_foil REAL,
    price_eur_foil REAL,
    keywords TEXT,
    layout TEXT,
    mana_cost TEXT,
    legalities TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    set_code TEXT,
    person TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collection_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scryfall_id TEXT NOT NULL REFERENCES scryfall_cards(id),
    quantity INTEGER DEFAULT 1,
    foil BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    location_id INTEGER REFERENCES locations(id),
    is_proxy BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    format TEXT,
    status TEXT DEFAULT 'in_progress',
    description TEXT,
    colors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deck_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    scryfall_id TEXT NOT NULL REFERENCES scryfall_cards(id),
    quantity INTEGER DEFAULT 1,
    collection_entry_id INTEGER REFERENCES collection_entries(id),
    is_commander BOOLEAN DEFAULT FALSE,
    is_sideboard BOOLEAN DEFAULT FALSE,
    board TEXT DEFAULT 'main'
);
"""

LOCATIONS_SEED = [
    # Staple Binders
    {"name": "Staples Blanc", "type": "staple_binder", "color": "white", "sort_order": 1},
    {"name": "Staples Bleu", "type": "staple_binder", "color": "blue", "sort_order": 2},
    {"name": "Staples Vert", "type": "staple_binder", "color": "green", "sort_order": 3},
    {"name": "Staples Noir", "type": "staple_binder", "color": "black", "sort_order": 4},
    {"name": "Staples Rouge", "type": "staple_binder", "color": "red", "sort_order": 5},
    {"name": "Staples Incolore", "type": "staple_binder", "color": "colorless", "sort_order": 6},
    {"name": "Staples Multicolor", "type": "staple_binder", "color": "multi", "sort_order": 7},
    # Legendary Binders
    {"name": "Légendaires Mono", "type": "legendary_binder", "sort_order": 8},
    {"name": "Légendaires Multi", "type": "legendary_binder", "sort_order": 9},
    # Set Binders (20 sets, alphabetical order)
    {"name": "Binder Adventures in the Forgotten Realms", "type": "set_binder", "set_code": "AFR", "sort_order": 10},
    {"name": "Binder Battle for Zendikar", "type": "set_binder", "set_code": "BFZ", "sort_order": 11},
    {"name": "Binder Champions of Kamigawa", "type": "set_binder", "set_code": "CHK", "sort_order": 12},
    {"name": "Binder Commander Legends", "type": "set_binder", "set_code": "CMR", "sort_order": 13},
    {"name": "Binder Double Masters", "type": "set_binder", "set_code": "2XM", "sort_order": 14},
    {"name": "Binder Kaladesh", "type": "set_binder", "set_code": "KLD", "sort_order": 15},
    {"name": "Binder Kaldheim", "type": "set_binder", "set_code": "KHM", "sort_order": 16},
    {"name": "Binder Kamigawa Neon Dynasty", "type": "set_binder", "set_code": "NEO", "sort_order": 17},
    {"name": "Binder M21", "type": "set_binder", "set_code": "M21", "sort_order": 18},
    {"name": "Binder MH1", "type": "set_binder", "set_code": "MH1", "sort_order": 19},
    {"name": "Binder MH2", "type": "set_binder", "set_code": "MH2", "sort_order": 20},
    {"name": "Binder MH3", "type": "set_binder", "set_code": "MH3", "sort_order": 21},
    {"name": "Binder Oath of the Gatewatch", "type": "set_binder", "set_code": "OGW", "sort_order": 22},
    {"name": "Binder Strixhaven", "type": "set_binder", "set_code": "STX", "sort_order": 23},
    {"name": "Binder Theros Beyond Death", "type": "set_binder", "set_code": "THB", "sort_order": 24},
    {"name": "Binder The Brothers' War", "type": "set_binder", "set_code": "BRO", "sort_order": 25},
    {"name": "Binder Throne of Eldraine", "type": "set_binder", "set_code": "ELD", "sort_order": 26},
    {"name": "Binder Time Spiral Remastered", "type": "set_binder", "set_code": "TSR", "sort_order": 27},
    {"name": "Binder Ultimate Masters", "type": "set_binder", "set_code": "UMA", "sort_order": 28},
    {"name": "Binder War of the Spark", "type": "set_binder", "set_code": "WAR", "sort_order": 29},
    # Other locations
    {"name": "Rangement Bulk", "type": "bulk", "sort_order": 30},
    {"name": "À trier", "type": "unsorted", "sort_order": 31},
    {"name": "Prêté à Arthur", "type": "lent", "person": "Arthur", "sort_order": 32},
    {"name": "Emprunté d'Arthur", "type": "borrowed", "person": "Arthur", "sort_order": 33},
    {"name": "À échanger", "type": "trade", "sort_order": 34},
]


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
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()

        # Seed locations if empty
        async with db.execute("SELECT COUNT(*) as cnt FROM locations") as cursor:
            row = await cursor.fetchone()
            if row["cnt"] == 0:
                for loc in LOCATIONS_SEED:
                    await db.execute(
                        """INSERT INTO locations (name, type, color, set_code, person, sort_order)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (
                            loc["name"],
                            loc["type"],
                            loc.get("color"),
                            loc.get("set_code"),
                            loc.get("person"),
                            loc.get("sort_order", 0),
                        ),
                    )
                await db.commit()
