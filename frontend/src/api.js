import axios from 'axios'

// En ligne (Railway) : utilise VITE_API_URL. En local : utilise le proxy Vite.
const BASE = import.meta.env.VITE_API_URL || ''
const api = axios.create({ baseURL: BASE + '/api' })

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers        = ()         => api.get('/users').then(r => r.data)
export const createUser      = (data)     => api.post('/users', data).then(r => r.data)
export const updateUser      = (id, data) => api.put(`/users/${id}`, data).then(r => r.data)
export const deleteUser      = (id)       => api.delete(`/users/${id}`)

// ── Accounts ──────────────────────────────────────────────────────────────────
export const getAccounts     = ()         => api.get('/accounts').then(r => r.data)
export const createAccount   = (data)     => api.post('/accounts', data).then(r => r.data)
export const updateAccount   = (id, data) => api.put(`/accounts/${id}`, data).then(r => r.data)
export const deleteAccount   = (id)       => api.delete(`/accounts/${id}`)

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories   = ()         => api.get('/categories').then(r => r.data)
export const createCategory  = (data)     => api.post('/categories', data).then(r => r.data)
export const updateCategory  = (id, data) => api.put(`/categories/${id}`, data).then(r => r.data)
export const deleteCategory  = (id)       => api.delete(`/categories/${id}`)

// ── Expenses ──────────────────────────────────────────────────────────────────
export const getExpenses     = (params)   => api.get('/expenses', { params }).then(r => r.data)
export const getExpense      = (id)       => api.get(`/expenses/${id}`).then(r => r.data)
export const createExpense   = (data)     => api.post('/expenses', data).then(r => r.data)
export const updateExpense   = (id, data) => api.put(`/expenses/${id}`, data).then(r => r.data)
export const deleteExpense   = (id)       => api.delete(`/expenses/${id}`)
export const settleSplit     = (eid, sid) => api.patch(`/expenses/${eid}/splits/${sid}/settle`)

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getSummary      = (params)   => api.get('/analytics/summary', { params }).then(r => r.data)
export const getByCategory   = (params)   => api.get('/analytics/by-category', { params }).then(r => r.data)
export const getMonthly      = (params)   => api.get('/analytics/monthly', { params }).then(r => r.data)
export const getByUser       = (params)   => api.get('/analytics/by-user', { params }).then(r => r.data)
export const getBalances     = ()         => api.get('/analytics/balances').then(r => r.data)
export const getWeekly       = (params)   => api.get('/analytics/weekly', { params }).then(r => r.data)

// ── Budgets ───────────────────────────────────────────────────────────────────
export const getBudgets      = (params)   => api.get('/budgets', { params }).then(r => r.data)
export const createBudget    = (data)     => api.post('/budgets', data).then(r => r.data)
export const updateBudget    = (id, data) => api.put(`/budgets/${id}`, data).then(r => r.data)
export const deleteBudget    = (id)       => api.delete(`/budgets/${id}`)
