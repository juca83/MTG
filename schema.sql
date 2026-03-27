-- MTG Collection Manager - Supabase (PostgreSQL) Schema
-- Run this in your Supabase SQL editor to set up the database

-- Cards cache from Scryfall
CREATE TABLE IF NOT EXISTS scryfall_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_code TEXT NOT NULL,
    set_name TEXT NOT NULL,
    collector_number TEXT,
    image_uri_normal TEXT,
    image_uri_small TEXT,
    image_uri_art_crop TEXT,
    colors JSONB DEFAULT '[]',
    color_identity JSONB DEFAULT '[]',
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
    keywords JSONB DEFAULT '[]',
    layout TEXT,
    mana_cost TEXT,
    legalities JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scryfall_cards_name ON scryfall_cards(name);
CREATE INDEX IF NOT EXISTS idx_scryfall_cards_set ON scryfall_cards(set_code);

-- Storage locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('staple_binder', 'legendary_binder', 'set_binder', 'bulk', 'unsorted', 'lent', 'borrowed', 'trade')),
    color TEXT,
    set_code TEXT,
    person TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Seed locations
INSERT INTO locations (name, type, color, sort_order) VALUES
    ('Staples Blanc', 'staple_binder', 'white', 1),
    ('Staples Bleu', 'staple_binder', 'blue', 2),
    ('Staples Vert', 'staple_binder', 'green', 3),
    ('Staples Noir', 'staple_binder', 'black', 4),
    ('Staples Rouge', 'staple_binder', 'red', 5),
    ('Staples Incolore', 'staple_binder', 'colorless', 6),
    ('Staples Multicolor', 'staple_binder', 'multi', 7),
    ('Légendaires Mono', 'legendary_binder', NULL, 8),
    ('Légendaires Multi', 'legendary_binder', NULL, 9)
ON CONFLICT DO NOTHING;

INSERT INTO locations (name, type, set_code, sort_order) VALUES
    ('Binder MH1', 'set_binder', 'MH1', 10),
    ('Binder MH2', 'set_binder', 'MH2', 11),
    ('Binder MH3', 'set_binder', 'MH3', 12),
    ('Binder Commander Legends', 'set_binder', 'CMR', 13),
    ('Binder Strixhaven', 'set_binder', 'STX', 14),
    ('Binder Brothers War', 'set_binder', 'BRO', 15),
    ('Binder Kaldheim', 'set_binder', 'KHM', 16),
    ('Binder War of the Spark', 'set_binder', 'WAR', 17),
    ('Binder 2XM', 'set_binder', '2XM', 18),
    ('Set Binder 10', 'set_binder', NULL, 19),
    ('Set Binder 11', 'set_binder', NULL, 20),
    ('Set Binder 12', 'set_binder', NULL, 21),
    ('Set Binder 13', 'set_binder', NULL, 22),
    ('Set Binder 14', 'set_binder', NULL, 23),
    ('Set Binder 15', 'set_binder', NULL, 24),
    ('Set Binder 16', 'set_binder', NULL, 25),
    ('Set Binder 17', 'set_binder', NULL, 26),
    ('Set Binder 18', 'set_binder', NULL, 27),
    ('Set Binder 19', 'set_binder', NULL, 28),
    ('Set Binder 20', 'set_binder', NULL, 29)
ON CONFLICT DO NOTHING;

INSERT INTO locations (name, type, sort_order) VALUES
    ('Rangement Bulk', 'bulk', 30),
    ('À trier', 'unsorted', 31),
    ('À échanger', 'trade', 34)
ON CONFLICT DO NOTHING;

INSERT INTO locations (name, type, person, sort_order) VALUES
    ('Prêté à Arthur', 'lent', 'Arthur', 32),
    ('Emprunté d''Arthur', 'borrowed', 'Arthur', 33)
ON CONFLICT DO NOTHING;

-- User's card collection
CREATE TABLE IF NOT EXISTS collection_entries (
    id BIGSERIAL PRIMARY KEY,
    scryfall_id TEXT NOT NULL REFERENCES scryfall_cards(id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    foil BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    location_id BIGINT REFERENCES locations(id),
    is_proxy BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_scryfall ON collection_entries(scryfall_id);
CREATE INDEX IF NOT EXISTS idx_collection_location ON collection_entries(location_id);

-- Decks
CREATE TABLE IF NOT EXISTS decks (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    format TEXT,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('to_do', 'in_progress', 'archived')),
    description TEXT,
    colors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deck entries
CREATE TABLE IF NOT EXISTS deck_entries (
    id BIGSERIAL PRIMARY KEY,
    deck_id BIGINT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    scryfall_id TEXT NOT NULL REFERENCES scryfall_cards(id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    collection_entry_id BIGINT REFERENCES collection_entries(id),
    is_commander BOOLEAN DEFAULT FALSE,
    is_sideboard BOOLEAN DEFAULT FALSE,
    board TEXT DEFAULT 'main' CHECK (board IN ('main', 'side', 'maybe'))
);

CREATE INDEX IF NOT EXISTS idx_deck_entries_deck ON deck_entries(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_entries_scryfall ON deck_entries(scryfall_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collection_entries_updated_at
    BEFORE UPDATE ON collection_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (for Supabase multi-user, optional)
-- ALTER TABLE collection_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deck_entries ENABLE ROW LEVEL SECURITY;
