import { supabase } from './supabase'
import { getISOWeek } from 'date-fns'

// ── Helper: requête dépenses avec toutes les relations ────────────────────────
async function fetchRawExpenses(filters = {}) {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!paid_by(id, name, color, emoji),
      category:categories(id, name, icon, color),
      account:accounts(id, name),
      splits:expense_splits(
        id, amount, is_settled, user_id,
        split_user:users(id, name, color, emoji)
      )
    `)

  if (filters.year && filters.month) {
    const y  = filters.year
    const m  = String(filters.month).padStart(2, '0')
    const nm = filters.month === 12 ? 1 : filters.month + 1
    const ny = filters.month === 12 ? filters.year + 1 : filters.year
    query = query
      .gte('date', `${y}-${m}-01`)
      .lt('date',  `${ny}-${String(nm).padStart(2, '0')}-01`)
  } else if (filters.year) {
    query = query
      .gte('date', `${filters.year}-01-01`)
      .lt('date',  `${filters.year + 1}-01-01`)
  }

  if (filters.category_id) query = query.eq('category_id', Number(filters.category_id))
  if (filters.paid_by)     query = query.eq('paid_by',     Number(filters.paid_by))
  if (filters.account_id)  query = query.eq('account_id',  Number(filters.account_id))
  if (filters.is_income !== undefined) query = query.eq('is_income', filters.is_income)

  query = query.order('date', { ascending: false }).order('id', { ascending: false })
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Transforme la réponse Supabase (imbriquée) en format plat attendu par les pages
function transformExpense(e) {
  return {
    id:             e.id,
    amount:         e.amount,
    description:    e.description,
    date:           e.date,
    paid_by:        e.paid_by,
    account_id:     e.account_id,
    category_id:    e.category_id,
    notes:          e.notes,
    is_income:      e.is_income,
    is_transfer:    e.is_transfer ?? false,
    created_at:     e.created_at,
    paid_by_name:   e.paid_by_user?.name  || null,
    paid_by_color:  e.paid_by_user?.color || null,
    paid_by_emoji:  e.paid_by_user?.emoji || null,
    category_name:  e.category?.name      || null,
    category_icon:  e.category?.icon      || null,
    category_color: e.category?.color     || null,
    account_name:   e.account?.name       || null,
    splits: (e.splits || []).map(s => ({
      id:         s.id,
      expense_id: e.id,
      user_id:    s.user_id,
      amount:     s.amount,
      is_settled: s.is_settled,
      user_name:  s.split_user?.name  || null,
      user_color: s.split_user?.color || null,
      user_emoji: s.split_user?.emoji || null,
    })),
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*').order('id')
  if (error) throw error
  return data || []
}

export async function createUser(userData) {
  const { data, error } = await supabase.from('users').insert(userData).select().single()
  if (error) throw error
  return data
}

export async function updateUser(id, userData) {
  const { data, error } = await supabase.from('users').update(userData).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export async function getAccounts() {
  const { data, error } = await supabase.from('accounts').select('*, owner:users(name)').order('id')
  if (error) throw error
  return (data || []).map(a => ({ ...a, owner_name: a.owner?.name || null, owner: undefined }))
}

export async function createAccount(accountData) {
  const { data, error } = await supabase.from('accounts').insert(accountData).select().single()
  if (error) throw error
  const { data: full } = await supabase.from('accounts').select('*, owner:users(name)').eq('id', data.id).single()
  return { ...full, owner_name: full.owner?.name || null, owner: undefined }
}

export async function updateAccount(id, accountData) {
  const { error } = await supabase.from('accounts').update(accountData).eq('id', id)
  if (error) throw error
  const { data } = await supabase.from('accounts').select('*, owner:users(name)').eq('id', id).single()
  return { ...data, owner_name: data.owner?.name || null, owner: undefined }
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}

export async function getAccountsWithBalance() {
  const [{ data: accts, error }, expenses] = await Promise.all([
    supabase.from('accounts').select('*, owner:users(name)').order('id'),
    fetchRawExpenses({})
  ])
  if (error) throw error
  return (accts || []).map(a => {
    const linked = expenses.filter(e => e.account_id === a.id)
    const relevant = a.balance_date
      ? linked.filter(e => e.date > a.balance_date)
      : linked
    const flow = relevant.reduce((s, e) =>
      e.is_income ? s + e.amount : s - e.amount
    , 0)
    return {
      ...a,
      owner_name: a.owner?.name || null,
      owner: undefined,
      computed_balance: (a.initial_balance || 0) + flow,
    }
  })
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories').select('*')
    .order('is_income', { ascending: true }).order('sort_order').order('name')
  if (error) throw error
  const seen = new Set()
  return (data || []).filter(c => {
    const key = `${c.name}|${c.is_income}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function createCategory(categoryData) {
  const { data, error } = await supabase
    .from('categories').insert({ ...categoryData, is_default: false }).select().single()
  if (error) throw error
  return data
}

export async function updateCategory(id, categoryData) {
  const { data, error } = await supabase.from('categories').update(categoryData).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { data: cat } = await supabase.from('categories').select('is_default').eq('id', id).single()
  if (cat?.is_default) throw new Error('Impossible de supprimer une catégorie par défaut')
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export async function getExpenses(filters = {}) {
  const raw = await fetchRawExpenses(filters)
  return raw.map(transformExpense)
}

export async function getExpense(id) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!paid_by(id, name, color, emoji),
      category:categories(id, name, icon, color),
      account:accounts(id, name),
      splits:expense_splits(
        id, amount, is_settled, user_id,
        split_user:users(id, name, color, emoji)
      )
    `)
    .eq('id', id).single()
  if (error) throw error
  return transformExpense(data)
}

export async function createExpense(expenseData) {
  const { splits = [], ...data } = expenseData
  const { data: expense, error } = await supabase.from('expenses').insert(data).select().single()
  if (error) throw error
  if (splits.length > 0) {
    const { error: se } = await supabase.from('expense_splits').insert(
      splits.map(s => ({ expense_id: expense.id, user_id: s.user_id, amount: s.amount }))
    )
    if (se) throw se
  }
  return getExpense(expense.id)
}

export async function updateExpense(id, expenseData) {
  const { splits, ...data } = expenseData
  if (Object.keys(data).length > 0) {
    const { error } = await supabase.from('expenses').update(data).eq('id', id)
    if (error) throw error
  }
  if (splits !== undefined) {
    await supabase.from('expense_splits').delete().eq('expense_id', id)
    if (splits.length > 0) {
      await supabase.from('expense_splits').insert(
        splits.map(s => ({ expense_id: id, user_id: s.user_id, amount: s.amount }))
      )
    }
  }
  return getExpense(id)
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function settleSplit(expenseId, splitId) {
  const { error } = await supabase.from('expense_splits').update({ is_settled: true }).eq('id', splitId)
  if (error) throw error
  return { ok: true }
}

// ── Analytics (calculé en JavaScript depuis les données brutes) ───────────────
export async function getSummary({ year, month } = {}) {
  const expenses = await fetchRawExpenses({ year, month })
  const total_expenses = expenses.filter(e => !e.is_income && !e.is_transfer).reduce((s, e) => s + e.amount, 0)
  const total_income   = expenses.filter(e =>  e.is_income && !e.is_transfer).reduce((s, e) => s + e.amount, 0)
  return { total_expenses, total_income, balance: total_income - total_expenses }
}

export async function getByCategory({ year, month, is_income = false } = {}) {
  const [expenses, categories] = await Promise.all([fetchRawExpenses({ year, month }), getCategories()])
  const filtered = expenses.filter(e => Boolean(e.is_income) === Boolean(is_income) && !e.is_transfer)
  return categories
    .filter(c => Boolean(c.is_income) === Boolean(is_income))
    .map(cat => ({
      id: cat.id, name: cat.name, icon: cat.icon, color: cat.color,
      total: filtered.filter(e => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
      count: filtered.filter(e => e.category_id === cat.id).length,
    }))
    .sort((a, b) => b.total - a.total)
}

export async function getMonthly({ year }) {
  const expenses = await fetchRawExpenses({ year })
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const monthExp = expenses.filter(e => new Date(e.date + 'T00:00:00').getMonth() + 1 === m)
    const exp = monthExp.filter(e => !e.is_income && !e.is_transfer).reduce((s, e) => s + e.amount, 0)
    const inc = monthExp.filter(e =>  e.is_income && !e.is_transfer).reduce((s, e) => s + e.amount, 0)
    return { month: m, expenses: exp, income: inc, balance: inc - exp }
  })
}

export async function getByUser({ year, month } = {}) {
  const [expenses, users] = await Promise.all([fetchRawExpenses({ year, month }), getUsers()])
  const filtered = expenses.filter(e => !e.is_income && !e.is_transfer)
  return users.map(u => ({
    id: u.id, name: u.name, color: u.color, emoji: u.emoji,
    paid:  filtered.filter(e => e.paid_by === u.id).reduce((s, e) => s + e.amount, 0),
    count: filtered.filter(e => e.paid_by === u.id).length,
  })).sort((a, b) => b.paid - a.paid)
}

export async function getBalances() {
  const [expenses, users] = await Promise.all([fetchRawExpenses({}), getUsers()])
  const { data: splits } = await supabase
    .from('expense_splits')
    .select('*, expense:expenses!expense_id(paid_by, is_income)')
    .eq('is_settled', false)

  const debtMap = {}
  for (const s of (splits || [])) {
    if (s.expense?.is_income) continue
    const creditor = s.expense?.paid_by
    const debtor   = s.user_id
    if (s.expense?.is_transfer) continue
    if (debtor === creditor || !creditor) continue
    const key = `${debtor}-${creditor}`
    if (!debtMap[key]) debtMap[key] = { debtor, creditor, amount: 0 }
    debtMap[key].amount += s.amount
  }
  return {
    users: users.map(u => ({
      ...u,
      total_paid: expenses.filter(e => e.paid_by === u.id && !e.is_income && !e.is_transfer).reduce((s, e) => s + e.amount, 0),
    })),
    debts: Object.values(debtMap).filter(d => d.amount > 0.01),
  }
}

export async function getWeekly({ year, month } = {}) {
  const expenses = await fetchRawExpenses({ year, month })
  const weekMap = {}
  for (const e of expenses.filter(ex => !ex.is_income && !ex.is_transfer)) {
    const w = String(getISOWeek(new Date(e.date + 'T00:00:00'))).padStart(2, '0')
    if (!weekMap[w]) weekMap[w] = { week: w, total: 0, count: 0 }
    weekMap[w].total += e.amount
    weekMap[w].count++
  }
  return Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week))
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export async function getBudgets({ month, year }) {
  const [{ data: budgets, error }, expenses] = await Promise.all([
    supabase.from('budgets').select('*, category:categories(name, icon, color)').eq('month', month).eq('year', year).order('id'),
    fetchRawExpenses({ year, month }),
  ])
  if (error) throw error
  return (budgets || []).map(b => ({
    ...b,
    category_name:  b.category?.name  || null,
    category_icon:  b.category?.icon  || null,
    category_color: b.category?.color || null,
    category: undefined,
    spent: (b.category_id
      ? expenses.filter(e => !e.is_income && !e.is_transfer && e.category_id === b.category_id)
      : expenses.filter(e => !e.is_income && !e.is_transfer)
    ).reduce((s, e) => s + e.amount, 0),
  }))
}

export async function createBudget(budgetData) {
  const { data, error } = await supabase.from('budgets').insert(budgetData).select().single()
  if (error) {
    if (error.code === '23505') {
      const e = new Error('Budget déjà existant pour cette catégorie')
      e.isConflict = true
      throw e
    }
    throw error
  }
  const { data: full } = await supabase.from('budgets').select('*, category:categories(name, icon, color)').eq('id', data.id).single()
  return { ...full, category_name: full.category?.name, category_icon: full.category?.icon, category_color: full.category?.color, category: undefined, spent: 0 }
}

export async function updateBudget(id, { amount }) {
  const { error } = await supabase.from('budgets').update({ amount }).eq('id', id)
  if (error) throw error
  const { data } = await supabase.from('budgets').select('*, category:categories(name, icon, color)').eq('id', id).single()
  return { ...data, category_name: data.category?.name, category_icon: data.category?.icon, category_color: data.category?.color, category: undefined, spent: 0 }
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}
