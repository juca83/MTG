from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScryfallCard(BaseModel):
    id: str
    name: str
    set_code: str
    set_name: str
    collector_number: Optional[str] = None
    image_uri_normal: Optional[str] = None
    image_uri_small: Optional[str] = None
    image_uri_art_crop: Optional[str] = None
    colors: Optional[List[str]] = None
    color_identity: Optional[List[str]] = None
    type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    cmc: Optional[float] = None
    power: Optional[str] = None
    toughness: Optional[str] = None
    rarity: Optional[str] = None
    price_usd: Optional[float] = None
    price_eur: Optional[float] = None
    price_usd_foil: Optional[float] = None
    price_eur_foil: Optional[float] = None
    keywords: Optional[List[str]] = None
    layout: Optional[str] = None
    mana_cost: Optional[str] = None
    legalities: Optional[dict] = None


class Location(BaseModel):
    id: int
    name: str
    type: str
    color: Optional[str] = None
    set_code: Optional[str] = None
    person: Optional[str] = None
    sort_order: int = 0


class LocationCreate(BaseModel):
    name: str
    type: str
    color: Optional[str] = None
    set_code: Optional[str] = None
    person: Optional[str] = None
    sort_order: int = 0


class CollectionEntryCreate(BaseModel):
    scryfall_id: str
    quantity: int = 1
    foil: bool = False
    language: str = "en"
    location_id: Optional[int] = None
    is_proxy: bool = False
    notes: Optional[str] = None


class CollectionEntryUpdate(BaseModel):
    quantity: Optional[int] = None
    foil: Optional[bool] = None
    language: Optional[str] = None
    location_id: Optional[int] = None
    is_proxy: Optional[bool] = None
    notes: Optional[str] = None


class CollectionEntry(BaseModel):
    id: int
    scryfall_id: str
    quantity: int
    foil: bool
    language: str
    location_id: Optional[int] = None
    is_proxy: bool
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    # Joined fields
    card: Optional[ScryfallCard] = None
    location: Optional[Location] = None


class DeckCreate(BaseModel):
    name: str
    format: Optional[str] = None
    status: str = "in_progress"
    description: Optional[str] = None
    colors: Optional[List[str]] = None


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    colors: Optional[List[str]] = None


class Deck(BaseModel):
    id: int
    name: str
    format: Optional[str] = None
    status: str
    description: Optional[str] = None
    colors: Optional[List[str]] = None
    created_at: str
    updated_at: str
    card_count: Optional[int] = None
    missing_count: Optional[int] = None


class DeckEntryCreate(BaseModel):
    scryfall_id: str
    quantity: int = 1
    collection_entry_id: Optional[int] = None
    is_commander: bool = False
    is_sideboard: bool = False
    board: str = "main"


class DeckEntryUpdate(BaseModel):
    quantity: Optional[int] = None
    collection_entry_id: Optional[int] = None
    is_commander: Optional[bool] = None
    is_sideboard: Optional[bool] = None
    board: Optional[str] = None


class DeckEntry(BaseModel):
    id: int
    deck_id: int
    scryfall_id: str
    quantity: int
    collection_entry_id: Optional[int] = None
    is_commander: bool
    is_sideboard: bool
    board: str
    card: Optional[ScryfallCard] = None
    collection_entry: Optional[CollectionEntry] = None
