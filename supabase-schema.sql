-- Budget Duo - Schéma Supabase
-- Collez ce texte dans l'éditeur SQL de Supabase et cliquez sur "Run"

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    emoji TEXT NOT NULL DEFAULT '👤',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS accounts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('common','personal')),
    owner_id BIGINT REFERENCES users(id),
    color TEXT NOT NULL DEFAULT '#10b981',
    icon TEXT NOT NULL DEFAULT '🏦',
    initial_balance REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '💰',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_income BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    paid_by BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT REFERENCES accounts(id),
    category_id BIGINT REFERENCES categories(id),
    notes TEXT,
    is_income BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS expense_splits (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id),
    amount REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, month, year, user_id)
);
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Catégories par défaut
INSERT INTO categories (name, icon, color, is_income, is_default, sort_order) VALUES
    ('Loyer / Logement', '🏠', '#ef4444', FALSE, TRUE,  1),
    ('Courses',          '🛒', '#f97316', FALSE, TRUE,  2),
    ('Restaurant',       '🍽️', '#f59e0b', FALSE, TRUE,  3),
    ('Bar / Verre',      '🍺', '#eab308', FALSE, TRUE,  4),
    ('Transport',        '🚌', '#84cc16', FALSE, TRUE,  5),
    ('Voiture',          '🚗', '#22c55e', FALSE, TRUE,  6),
    ('Santé',            '🏥', '#10b981', FALSE, TRUE,  7),
    ('Shopping',         '🛍️', '#14b8a6', FALSE, TRUE,  8),
    ('Abonnements',      '📱', '#06b6d4', FALSE, TRUE,  9),
    ('Loisirs',          '🎮', '#3b82f6', FALSE, TRUE, 10),
    ('Voyages',          '✈️', '#6366f1', FALSE, TRUE, 11),
    ('Cadeaux',          '🎁', '#8b5cf6', FALSE, TRUE, 12),
    ('Investissements',  '📈', '#a855f7', FALSE, TRUE, 13),
    ('Épargne',          '🐷', '#ec4899', FALSE, TRUE, 14),
    ('Divers',           '📦', '#6b7280', FALSE, TRUE, 15),
    ('Salaire',          '💼', '#10b981', TRUE,  TRUE,  1),
    ('Remboursement',    '💳', '#3b82f6', TRUE,  TRUE,  2),
    ('Autre revenu',     '💰', '#6366f1', TRUE,  TRUE,  3);
