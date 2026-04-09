import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { createExpense, updateExpense, getUsers, getCategories, getAccounts } from '../api'

const EMOJIS = ['👤','👨','👩','🧑','😊','😎','🦄','🐼','🐸','🦊']
const COLORS = ['#6366f1','#ec4899','#f97316','#22c55e','#3b82f6','#a855f7','#ef4444','#14b8a6']

export default function ExpenseForm({ expense, onSave, onClose }) {
  const [users, setUsers]         = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    amount:      expense?.amount ?? '',
    description: expense?.description ?? '',
    date:        expense?.date ?? today,
    paid_by:     expense?.paid_by ?? '',
    account_id:  expense?.account_id ?? '',
    category_id: expense?.category_id ?? '',
    notes:       expense?.notes ?? '',
    is_income:   expense?.is_income ?? false,
    splits:      expense?.splits ?? [],
  })
  const [splitMode, setSplitMode] = useState(
    expense?.splits?.length > 0 ? 'custom' : 'equal'
  )

  useEffect(() => {
    Promise.all([getUsers(), getCategories(), getAccounts()]).then(([u, c, a]) => {
      setUsers(u)
      setCategories(c)
      setAccounts(a)
      if (!form.paid_by && u.length > 0) setForm(f => ({ ...f, paid_by: u[0].id }))
    })
  }, [])

  // Auto-compute equal splits
  useEffect(() => {
    if (splitMode === 'equal' && users.length > 0 && form.amount) {
      const each = parseFloat(form.amount) / users.length
      setForm(f => ({
        ...f,
        splits: users.map(u => ({ user_id: u.id, amount: parseFloat(each.toFixed(2)) }))
      }))
    } else if (splitMode === 'none') {
      setForm(f => ({ ...f, splits: [] }))
    }
  }, [splitMode, form.amount, users])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function updateSplit(user_id, amount) {
    setForm(f => ({
      ...f,
      splits: f.splits.map(s =>
        s.user_id === user_id ? { ...s, amount: parseFloat(amount) || 0 } : s
      )
    }))
  }

  function toggleSplitUser(user_id) {
    const exists = form.splits.find(s => s.user_id === user_id)
    if (exists) {
      setForm(f => ({ ...f, splits: f.splits.filter(s => s.user_id !== user_id) }))
    } else {
      setForm(f => ({ ...f, splits: [...f.splits, { user_id, amount: 0 }] }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.paid_by) { toast.error('Montant et payeur requis'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount:      parseFloat(form.amount),
        paid_by:     parseInt(form.paid_by),
        account_id:  form.account_id  ? parseInt(form.account_id)  : null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      }
      const result = expense
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload)
      onSave(result)
      toast.success(expense ? 'Dépense modifiée' : 'Dépense ajoutée !')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const expCategories = categories.filter(c => !c.is_income)
  const incCategories = categories.filter(c => c.is_income)
  const shownCats     = form.is_income ? incCategories : expCategories

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-app-surface z-10">
          <h2 className="text-lg font-bold">
            {expense ? 'Modifier' : 'Nouvelle dépense'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
          {/* Income / Expense toggle */}
          <div className="flex gap-2">
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                !form.is_income ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-app-surface2 text-gray-400 border border-app-border'
              }`}
              onClick={() => set('is_income', false)}>
              💸 Dépense
            </button>
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                form.is_income ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-app-surface2 text-gray-400 border border-app-border'
              }`}
              onClick={() => set('is_income', true)}>
              💰 Revenu
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Montant (€) *</label>
            <input
              type="number" step="0.01" min="0" placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className="input-field text-2xl font-bold text-center"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description *</label>
            <input
              type="text" placeholder="Ex: Courses Carrefour"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="input-field"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Date</label>
            <input type="date" value={form.date}
              onChange={e => set('date', e.target.value)}
              className="input-field"
            />
          </div>

          {/* Paid by */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Payé par *</label>
            <div className="flex gap-2 flex-wrap">
              {users.map(u => (
                <button key={u.id} type="button"
                  onClick={() => set('paid_by', u.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.paid_by === u.id
                      ? 'border-app-accent bg-app-accent/20 text-white'
                      : 'border-app-border bg-app-surface2 text-gray-300'
                  }`}>
                  <span className="text-lg">{u.emoji}</span>
                  <span style={{ color: u.color }}>{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {shownCats.map(c => (
                <button key={c.id} type="button"
                  onClick={() => set('category_id', form.category_id === c.id ? '' : c.id)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                    form.category_id === c.id
                      ? 'text-white border-transparent'
                      : 'border-app-border bg-app-surface2 text-gray-300'
                  }`}
                  style={form.category_id === c.id ? { background: c.color + '40', borderColor: c.color } : {}}>
                  <span>{c.icon}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Compte bancaire</label>
              <select value={form.account_id} onChange={e => set('account_id', e.target.value)}
                className="input-field">
                <option value="">— Aucun compte —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Splits */}
          {!form.is_income && users.length > 1 && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Répartition</label>
              <div className="flex gap-2 mb-3">
                {['none','equal','custom'].map(m => (
                  <button key={m} type="button"
                    onClick={() => setSplitMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      splitMode === m
                        ? 'bg-app-accent text-white border-app-accent'
                        : 'bg-app-surface2 text-gray-400 border-app-border'
                    }`}>
                    {m === 'none' ? 'Aucune' : m === 'equal' ? 'Égale' : 'Perso'}
                  </button>
                ))}
              </div>

              {splitMode === 'custom' && (
                <div className="space-y-2">
                  {users.map(u => {
                    const split = form.splits.find(s => s.user_id === u.id)
                    return (
                      <div key={u.id} className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleSplitUser(u.id)}
                          className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border text-sm ${
                            split ? 'border-app-accent bg-app-accent/10' : 'border-app-border bg-app-surface2 text-gray-400'
                          }`}>
                          <span>{u.emoji}</span>
                          <span style={{ color: u.color }}>{u.name}</span>
                        </button>
                        {split && (
                          <input type="number" step="0.01" min="0"
                            value={split.amount}
                            onChange={e => updateSplit(u.id, e.target.value)}
                            className="input-field w-24 text-right"
                          />
                        )}
                      </div>
                    )
                  })}
                  {form.splits.length > 0 && (
                    <div className="text-xs text-right pr-1">
                      <span className={
                        Math.abs(form.splits.reduce((s,x) => s + x.amount, 0) - parseFloat(form.amount || 0)) < 0.01
                          ? 'text-green-400' : 'text-red-400'
                      }>
                        Total réparti: {form.splits.reduce((s,x) => s + x.amount, 0).toFixed(2)} €
                        {' / '}
                        {parseFloat(form.amount || 0).toFixed(2)} €
                      </span>
                    </div>
                  )}
                </div>
              )}

              {splitMode === 'equal' && form.splits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.splits.map(s => {
                    const u = users.find(u => u.id === s.user_id)
                    return u ? (
                      <div key={s.user_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-accent/40 bg-app-accent/10 text-sm">
                        <span>{u.emoji}</span>
                        <span style={{ color: u.color }}>{u.name}</span>
                        <span className="text-gray-400 ml-1">{s.amount.toFixed(2)}€</span>
                      </div>
                    ) : null
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notes (optionnel)</label>
            <textarea rows={2} placeholder="Notes supplémentaires..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input-field resize-none"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? 'Enregistrement...' : expense ? '✏️ Modifier' : '+ Ajouter'}
          </button>
        </form>
      </div>
    </div>
  )
}
