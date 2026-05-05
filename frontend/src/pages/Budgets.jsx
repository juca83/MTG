import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getBudgets, createBudget, updateBudget, deleteBudget, getCategories } from '../api'

function fmt(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0) }

function BudgetCard({ budget, onEdit, onDelete }) {
  const pct = budget.amount > 0 ? Math.min(100, (budget.spent / budget.amount) * 100) : 0
  const over = budget.spent > budget.amount
  const remaining = budget.amount - budget.spent

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{budget.category_icon || '💰'}</span>
          <div>
            <p className="font-semibold text-sm">{budget.category_name || 'Global'}</p>
            <p className="text-xs text-gray-500">Budget: {fmt(budget.amount)}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(budget)} className="p-1.5 rounded-lg hover:bg-app-surface2 text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(budget.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">
          Dépensé: <span className={over ? 'text-red-400 font-bold' : 'text-white font-semibold'}>{fmt(budget.spent)}</span>
        </span>
        <span className={over ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
          {over ? `-${fmt(Math.abs(remaining))} dépassé` : `${fmt(remaining)} restant`}
        </span>
      </div>

      <div className="h-2.5 bg-app-surface2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: over ? '#ef4444' : pct > 80 ? '#f97316' : (budget.category_color || '#6366f1'),
          }}
        />
      </div>
      <div className="text-right text-xs text-gray-500 mt-1">{pct.toFixed(0)}%</div>
    </div>
  )
}

function BudgetFormModal({ budget, month, year, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    category_id: budget?.category_id ?? '',
    amount:      budget?.amount ?? '',
    month, year,
  })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.amount) { toast.error('Montant requis'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount:      parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      }
      if (budget) {
        await updateBudget(budget.id, { amount: payload.amount })
      } else {
        await createBudget(payload)
      }
      toast.success(budget ? 'Budget modifié' : 'Budget créé')
      onSave()
    } catch (err) {
      if (err.isConflict) toast.error('Budget déjà existant pour cette catégorie')
      else toast.error('Erreur')
    } finally {
      setLoading(false)
    }
  }

  const expCats = categories.filter(c => !c.is_income)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">{budget ? 'Modifier le budget' : 'Nouveau budget'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="px-5 pb-8 space-y-4">
          {!budget && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="input-field">
                <option value="">— Budget global —</option>
                {expCats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Montant budget (€)</label>
            <input type="number" step="1" min="0" placeholder="Ex: 500"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="input-field text-xl font-bold" autoFocus />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Enregistrement...' : budget ? '✓ Modifier' : '+ Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [budgets, setBudgets]     = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editBudget, setEditBudget] = useState(null)

  function load() {
    getBudgets({ month, year }).then(setBudgets)
  }

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  useEffect(() => { load() }, [month, year])

  async function handleDelete(id) {
    if (!confirm('Supprimer ce budget ?')) return
    await deleteBudget(id)
    toast.success('Budget supprimé')
    load()
  }

  function prevMonth() {
    const d = new Date(year, month - 2, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth() + 1)
  }
  function nextMonth() {
    const d = new Date(year, month, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth() + 1)
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr })
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent  = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="page-padding">
      <div className="pt-2 mb-5">
        <h1 className="text-2xl font-bold">Budgets</h1>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-app-surface2"><ChevronLeft size={18} /></button>
        <span className="font-semibold capitalize">{monthLabel}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-xl hover:bg-app-surface2 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="surface-card p-4 mb-5">
          <div className="flex justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">Total budgeté</p>
              <p className="text-xl font-bold">{fmt(totalBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total dépensé</p>
              <p className={`text-xl font-bold ${totalSpent > totalBudget ? 'text-red-400' : 'text-green-400'}`}>
                {fmt(totalSpent)}
              </p>
            </div>
          </div>
          <div className="h-3 bg-app-surface2 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%`,
                background: totalSpent > totalBudget ? '#ef4444' : '#6366f1',
              }} />
          </div>
        </div>
      )}

      {/* Budgets */}
      {budgets.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">🎯</p>
          <p>Aucun budget ce mois-ci</p>
          <p className="text-sm mt-1">Créez des budgets pour mieux gérer vos dépenses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => (
            <BudgetCard key={b.id} budget={b}
              onEdit={b => { setEditBudget(b); setShowForm(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add button */}
      <button onClick={() => { setEditBudget(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-app-accent rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all z-30">
        <Plus size={26} />
      </button>

      {showForm && (
        <BudgetFormModal
          budget={editBudget}
          month={month} year={year}
          categories={categories}
          onSave={() => { setShowForm(false); setEditBudget(null); load() }}
          onClose={() => { setShowForm(false); setEditBudget(null) }}
        />
      )}
    </div>
  )
}
