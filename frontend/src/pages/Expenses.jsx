import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getExpenses, deleteExpense, getCategories, getUsers } from '../api'
import ExpenseForm from '../components/ExpenseForm'

function fmt(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0) }

export default function Expenses() {
  const [expenses, setExpenses]   = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [editExp, setEditExp]     = useState(null)
  const [showFilter, setShowFilter] = useState(false)

  const now = new Date()
  const [filters, setFilters] = useState({
    year:        now.getFullYear(),
    month:       now.getMonth() + 1,
    category_id: '',
    paid_by:     '',
    search:      '',
  })

  useEffect(() => {
    Promise.all([getCategories(), getUsers()]).then(([c, u]) => {
      setCategories(c); setUsers(u)
    })
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = { year: filters.year, month: filters.month, limit: 200 }
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.paid_by)     params.paid_by     = filters.paid_by
    getExpenses(params)
      .then(data => {
        let filtered = data
        if (filters.search) {
          const q = filters.search.toLowerCase()
          filtered = data.filter(e => e.description.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q))
        }
        setExpenses(filtered)
      })
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    setFilters(f => {
      const d = new Date(f.year, f.month - 2, 1)
      return { ...f, year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }
  function nextMonth() {
    setFilters(f => {
      const d = new Date(f.year, f.month, 1)
      return { ...f, year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette dépense ?')) return
    await deleteExpense(id)
    toast.success('Supprimé')
    load()
  }

  // Group by date
  const grouped = {}
  for (const e of expenses) {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const isCurrentMonth = filters.month === now.getMonth() + 1 && filters.year === now.getFullYear()
  const monthLabel = format(new Date(filters.year, filters.month - 1, 1), 'MMMM yyyy', { locale: fr })

  const totalMonth = expenses.filter(e => !e.is_income).reduce((s, e) => s + e.amount, 0)
  const expCount   = expenses.filter(e => !e.is_income).length

  return (
    <div className="page-padding">
      <div className="pt-2 mb-4">
        <h1 className="text-2xl font-bold mb-4">Dépenses</h1>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-app-surface2"><ChevronLeft size={18} /></button>
          <span className="font-semibold capitalize">{monthLabel}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-xl hover:bg-app-surface2 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>

        {/* Summary strip */}
        <div className="surface-card p-3 mb-3 flex justify-between items-center">
          <span className="text-gray-400 text-sm">{expCount} dépenses</span>
          <span className="font-bold text-red-400 text-lg">{fmt(totalMonth)}</span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" placeholder="Rechercher..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="input-field pl-9 pr-4"
          />
          {filters.search && (
            <button onClick={() => setFilters(f => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex gap-2">
          <select value={filters.category_id}
            onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}
            className="input-field flex-1 text-sm py-2">
            <option value="">Toutes catégories</option>
            {categories.filter(c => !c.is_income).map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select value={filters.paid_by}
            onChange={e => setFilters(f => ({ ...f, paid_by: e.target.value }))}
            className="input-field flex-1 text-sm py-2">
            <option value="">Tous</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.emoji} {u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses list grouped by date */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">Chargement...</div>
      ) : dates.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">🤷</p>
          <p>Aucune dépense ce mois-ci</p>
          <p className="text-sm mt-1">Appuyez sur + pour en ajouter</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map(date => {
            const dayTotal = grouped[date]
              .filter(e => !e.is_income)
              .reduce((s, e) => s + e.amount, 0)
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {format(new Date(date + 'T00:00:00'), 'EEEE d MMMM', { locale: fr })}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-xs text-red-400 font-medium">{fmt(dayTotal)}</span>
                  )}
                </div>
                <div className="surface-card divide-y divide-app-border overflow-hidden">
                  {grouped[date].map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: (e.category_color || '#6366f1') + '25' }}>
                        {e.category_icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{e.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs" style={{ color: e.paid_by_color }}>
                            {e.paid_by_emoji} {e.paid_by_name}
                          </span>
                          {e.category_name && (
                            <>
                              <span className="text-gray-600">·</span>
                              <span className="text-xs text-gray-500">{e.category_name}</span>
                            </>
                          )}
                        </div>
                        {e.splits.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {e.splits.map(s => (
                              <span key={s.id} className="text-xs px-1.5 py-0.5 rounded-full bg-app-surface2 text-gray-400">
                                {s.user_emoji} {s.user_name} {fmt(s.amount)}
                                {s.is_settled ? ' ✓' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`font-bold text-sm ${e.is_income ? 'text-green-600' : 'text-red-500'}`}>
                          {e.is_income ? '+' : '-'}{fmt(e.amount)}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditExp(e); setShowForm(true) }}
                            className="p-1.5 rounded-lg hover:bg-app-surface2 text-gray-500 hover:text-gray-900 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(e.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditExp(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-app-accent rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all z-30">
        <Plus size={26} />
      </button>

      {showForm && (
        <ExpenseForm
          expense={editExp}
          onSave={() => { setShowForm(false); setEditExp(null); load() }}
          onClose={() => { setShowForm(false); setEditExp(null) }}
        />
      )}
    </div>
  )
}
