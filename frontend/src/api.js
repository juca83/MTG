import { supabase } from './supabase'
import { getISOWeek } from 'date-fns'

// ── Helper: requête dépenses sans jointures PostgREST (plus robuste) ──────────
async function fetchRawExpenses(filters = {}) {
  let query = supabase
    .from('expenses')
    .select('*, splits:expense_splits(id, amount, is_settled, user_id)')

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
  const expenses = data || []
  if (expenses.length === 0) return []

  // Enrichissement côté JS — évite les dépendances aux FK PostgREST
  const [{ data: users }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, name, color, emoji'),
    supabase.from('categories').select('id, name, icon, color'),
    supabase.from('accounts').select('id, name'),
  ])
  const uMap = Object.fromEntries((users      || []).map(x => [x.id, x]))
  const cMap = Object.fromEntries((categories || []).map(x => [x.id, x]))
  const aMap = Object.fromEntries((accounts   || []).map(x => [x.id, x]))

  return expenses.map(e => ({
    ...e,
    paid_by_user: uMap[e.paid_by]        || null,
    category:     cMap[e.category_id]    || null,
    account:      aMap[e.account_id]     || null,
    splits: (e.splits || []).map(s => ({
      ...s,
      split_user: uMap[s.user_id] || null,
    })),
  }))
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
    to_account_id:  e.to_account_id || null,
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
  const { data, error } = await supabase.from('accounts').select('*').order('id')
  if (error) throw error
  return (data || []).map(a => ({ ...a, owner_name: null }))
}

export async function createAccount(accountData) {
  const { data, error } = await supabase.from('accounts').insert(accountData).select().single()
  if (error) throw error
  return { ...data, owner_name: null }
}

export async function updateAccount(id, accountData) {
  const { error } = await supabase.from('accounts').update(accountData).eq('id', id)
  if (error) throw error
  const { data } = await supabase.from('accounts').select('*').eq('id', id).single()
  return { ...data, owner_name: null }
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}

export async function getAccountsWithBalance() {
  const { data: accts, error } = await supabase.from('accounts').select('*').order('id')
  if (error) throw error
  let expenses = []
  try { expenses = await fetchRawExpenses({}) } catch { /* balance uses initial_balance only */ }
  return (accts || []).map(a => {
    const linked = expenses.filter(e => e.account_id === a.id || e.to_account_id === a.id)
    const relevant = a.balance_date
      ? linked.filter(e => e.date > a.balance_date)
      : linked
    const flow = relevant.reduce((s, e) => {
      if (e.is_transfer) {
        if (e.to_account_id === a.id) return s + e.amount
        if (e.account_id   === a.id) return s - e.amount
        return s
      }
      if (e.account_id !== a.id) return s
      return e.is_income ? s + e.amount : s - e.amount
    }, 0)
    return {
      ...a,
      owner_name: null,
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
    .select('*, splits:expense_splits(id, amount, is_settled, user_id)')
    .eq('id', id).single()
  if (error) throw error
  const [{ data: users }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, name, color, emoji'),
    supabase.from('categories').select('id, name, icon, color'),
    supabase.from('accounts').select('id, name'),
  ])
  const uMap = Object.fromEntries((users      || []).map(x => [x.id, x]))
  const cMap = Object.fromEntries((categories || []).map(x => [x.id, x]))
  const aMap = Object.fromEntries((accounts   || []).map(x => [x.id, x]))
  return transformExpense({
    ...data,
    paid_by_user: uMap[data.paid_by]     || null,
    category:     cMap[data.category_id] || null,
    account:      aMap[data.account_id]  || null,
    splits: (data.splits || []).map(s => ({ ...s, split_user: uMap[s.user_id] || null })),
  })
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
  let expenses = []
  try { expenses = await fetchRawExpenses({}) } catch { /* totals will be 0 */ }
  const users = await getUsers()
  const { data: splits } = await supabase
    .from('expense_splits')
    .select('*, expense:expenses(paid_by, is_income, is_transfer)')
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
  const [{ data: budgets, error }, { data: cats }, { data: accts }] = await Promise.all([
    supabase.from('budgets').select('*').eq('month', month).eq('year', year).order('id'),
    supabase.from('categories').select('id, name, icon, color'),
    supabase.from('accounts').select('id, type, owner_id'),
  ])
  if (error) throw error
  const catMap = Object.fromEntries((cats || []).map(c => [c.id, c]))
  let expenses = []
  try { expenses = await fetchRawExpenses({ year, month }) } catch { /* spent defaults to 0 */ }
  const accounts = accts || []

  return (budgets || []).map(b => {
    let base = expenses.filter(e => !e.is_income && !(e.is_transfer ?? false))
    if (b.category_id) base = base.filter(e => e.category_id === b.category_id)

    let filtered
    if (accounts.length === 0) {
      filtered = base
    } else if (b.user_id != null) {
      // Personal budget: this user's personal account, NOT split between all
      filtered = base.filter(e => {
        if ((e.splits || []).length >= 2) return false
        const acct = accounts.find(a => a.id === e.account_id)
        if (acct?.owner_id === b.user_id && acct?.type === 'personal') return true
        if (!e.account_id && e.paid_by === b.user_id) return true
        return false
      })
    } else {
      // Global budget: common accounts + expenses split between multiple people
      filtered = base.filter(e => {
        const acct = accounts.find(a => a.id === e.account_id)
        return acct?.type === 'common' || (e.splits || []).length >= 2
      })
    }

    const cat = catMap[b.category_id]
    return {
      ...b,
      category_name:  cat?.name  || null,
      category_icon:  cat?.icon  || null,
      category_color: cat?.color || null,
      spent: filtered.reduce((s, e) => s + e.amount, 0),
    }
  })
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
  const { data: cat } = await supabase.from('categories').select('name, icon, color').eq('id', data.category_id).maybeSingle()
  return { ...data, category_name: cat?.name || null, category_icon: cat?.icon || null, category_color: cat?.color || null, spent: 0 }
}

export async function updateBudget(id, { amount }) {
  const { error } = await supabase.from('budgets').update({ amount }).eq('id', id)
  if (error) throw error
  const { data } = await supabase.from('budgets').select('*').eq('id', id).single()
  const { data: cat } = await supabase.from('categories').select('name, icon, color').eq('id', data.category_id).maybeSingle()
  return { ...data, category_name: cat?.name || null, category_icon: cat?.icon || null, category_color: cat?.color || null, spent: 0 }
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}
