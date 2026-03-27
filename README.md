# MTG Collection Manager

A full-stack PWA for managing your Magic: The Gathering card collection, built with React + FastAPI + Scryfall.

## Features

- **Scryfall-powered search** with full syntax support and autocomplete
- **Collection management** with location tracking (35 pre-configured locations)
- **Deck builder** with analysis (mana curve, color distribution, card types)
- **Missing cards tab** with similar card suggestions from your collection
- **Manabox CSV import** with automatic location routing
- **PWA** – installable on iPhone/iPad via Safari "Add to Home Screen"
- **Dark theme**, mobile-first design

## Pre-configured Locations

### Staple Binders (7)
Staples Blanc, Bleu, Vert, Noir, Rouge, Incolore, Multicolor

### Legendary Binders (2)
Légendaires Mono, Légendaires Multi

### Set Binders (11 configured + 11 placeholders)
MH1, MH2, MH3, Commander Legends (CMR), Strixhaven (STX), Brothers War (BRO), Kaldheim (KHM), War of the Spark (WAR), 2XM + 11 placeholders

### Other
Rangement Bulk, À trier, Prêté à Arthur, Emprunté d'Arthur, À échanger

## Quick Start

```bash
./start.sh
```

Then open http://localhost:3000

### Manual Start

**Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## iPhone/iPad Access

1. Find your machine's local IP: `hostname -I`
2. Open `http://<your-ip>:3000` in Safari
3. Tap Share → "Add to Home Screen"

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS, Vite, PWA |
| Backend | Python FastAPI, uvicorn |
| Database | SQLite (local dev), PostgreSQL/Supabase schema at `schema.sql` |
| Card Data | Scryfall API |

## API Endpoints

- `GET /api/cards/search?q=<scryfall_query>` - Search cards
- `GET /api/cards/autocomplete?q=<name>` - Name autocomplete
- `GET /api/collection` - List collection entries
- `POST /api/collection` - Add card to collection
- `GET /api/decks` - List decks
- `POST /api/decks` - Create deck
- `GET /api/decks/{id}/analysis` - Deck analysis
- `GET /api/decks/{id}/missing` - Missing cards with suggestions
- `POST /api/import/manabox` - Import Manabox CSV
- Full docs at http://localhost:8000/docs

## Migrating to Supabase

1. Run `schema.sql` in your Supabase SQL editor
2. Update backend to use `asyncpg` or `supabase-py` instead of `aiosqlite`
3. Set `DATABASE_URL` environment variable

## Manabox CSV Import

Export from Manabox → Import CSV button in Collection tab.

Category mapping:
- `staples` → routes to correct color Staples binder (auto-detected from card's color identity)
- `legendaries` → Légendaires Mono/Multi
- `bulks` → Rangement Bulk
- `for trades` → À échanger
- `lent to arthur` → Prêté à Arthur
- `proxy` (any category) → marked as Proxy
