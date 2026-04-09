from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Users ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    color: str = '#6366f1'
    emoji: str = '👤'

class UserUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

class User(BaseModel):
    id: int
    name: str
    color: str
    emoji: str
    created_at: str


# ── Accounts ─────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    type: str  # 'common' | 'personal'
    owner_id: Optional[int] = None
    color: str = '#10b981'
    icon: str = '🏦'
    initial_balance: float = 0.0

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    owner_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    initial_balance: Optional[float] = None

class Account(BaseModel):
    id: int
    name: str
    type: str
    owner_id: Optional[int] = None
    color: str
    icon: str
    initial_balance: float
    created_at: str
    owner_name: Optional[str] = None


# ── Categories ───────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    icon: str = '💰'
    color: str = '#6366f1'
    is_income: bool = False
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_income: Optional[bool] = None
    sort_order: Optional[int] = None

class Category(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    is_income: bool
    sort_order: int


# ── Expense Splits ────────────────────────────────────────────────────────────

class SplitCreate(BaseModel):
    user_id: int
    amount: float

class Split(BaseModel):
    id: int
    expense_id: int
    user_id: int
    amount: float
    is_settled: bool
    user_name: Optional[str] = None
    user_color: Optional[str] = None
    user_emoji: Optional[str] = None


# ── Expenses ─────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    amount: float
    description: str
    date: str  # ISO date string YYYY-MM-DD
    paid_by: int
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    is_income: bool = False
    splits: List[SplitCreate] = []

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[str] = None
    paid_by: Optional[int] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    is_income: Optional[bool] = None
    splits: Optional[List[SplitCreate]] = None

class Expense(BaseModel):
    id: int
    amount: float
    description: str
    date: str
    paid_by: int
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    is_income: bool
    created_at: str
    # Joined
    paid_by_name: Optional[str] = None
    paid_by_color: Optional[str] = None
    paid_by_emoji: Optional[str] = None
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    account_name: Optional[str] = None
    splits: List[Split] = []


# ── Budgets ──────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category_id: Optional[int] = None
    amount: float
    month: int
    year: int
    user_id: Optional[int] = None

class BudgetUpdate(BaseModel):
    amount: Optional[float] = None

class Budget(BaseModel):
    id: int
    category_id: Optional[int] = None
    amount: float
    month: int
    year: int
    user_id: Optional[int] = None
    created_at: str
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    spent: Optional[float] = None
