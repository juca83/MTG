import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { createExpense, updateExpense, getUsers, getCategories, getAccounts } from '../api'

export default function ExpenseForm({ expense, onSave, onClose }) {
  const [users, setUsers]           = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts]     = useState([])
  const [loading, setLoading]       = useState(false)

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
    is_transfer: expense?.is_transfer ?? false,
  })

  const [splitFor, setSplitFor] = useState(() => {
    if (!expense?.splits || expense.splits.length === 0) return 'none'
    if (expense.splits.length === 1) return expense.splits[0].user_id
    return 'all'
  })

  useEffect(() => {
    Promise.all([getUsers(), getCategories(), getAccounts()]).then(([u, c, a]) => {
      setUsers(u)
      setCategories(c)
      setAccounts(a)
      if (!form.paid_by && u.length > 0) setForm(f => ({ ...f, paid_by: u[0].id }))
    })
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function setType(isIncome, isTransfer) {
    setForm(f => ({ ...f, is_income: isIncome, is_transfer: isTransfer, category_id: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.paid_by) { toast.error('Montant et payeur requis'); return }
    setLoading(true)
    try {
      const amt = parseFloat(String(form.amount).replace(',', '.'))
      let splits = []
      if (!form.is_income && !form.is_transfer) {
        if (splitFor === 'all' && users.length > 0) {
          const each = amt / users.length
          splits = users.map(u => ({ user_id: u.id, amount: parseFloat(each.toFixed(2)) }))
        } else if (typeof splitFor === 'number') {
          splits = [{ user_id: splitFor, amount: amt }]
        }
      }
      const payload = {
        ...form,
        amount:      amt,
        paid_by:     parseInt(form.paid_by),
        account_id:  form.account_id  ? parseInt(form.account_id)  : null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        splits,
      }
      const result = expense
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload)
      onSave(result)
      toast.success(expense ? 'Modifié !' : 'Ajouté !')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const expCategories = categories.filter(c => !c.is_income)
  const incCategories = categories.filter(c => c.is_income)
  const shownCats     = form.is_income ? incCategories : expCategories

  const amtNum = parseFloat(String(form.amount).replace(',', '.'))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-app-surface z-10">
          <h2 className="text-lg font-bold">
            {expense ? 'Modifier' : 'Nouvelle entrée'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                !form.is_income && !form.is_transfer
                  ? 'bg-red-500/20 text-red-600 border border-red-500/40'
                  : 'bg-app-surface2 text-gray-400 border border-app-border'
              }`}
              onClick={() => setType(false, false)}>
              💸 Dépense
            </button>
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                form.is_income
                  ? 'bg-green-500/20 text-green-700 border border-green-500/40'
                  : 'bg-app-surface2 text-gray-400 border border-app-border'
              }`}
              onClick={() => setType(true, false)}>
              💰 Revenu
            </button>
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                form.is_transfer
                  ? 'bg-blue-500/20 text-blue-700 border border-blue-500/40'
                  : 'bg-app-surface2 text-gray-400 border border-app-border'
              }`}
              onClick={() => setType(false, true)}>
              🔄 Transfert
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Montant (CHF) *</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value.replace(',', '.'))}
              className="input-field text-2xl font-bold text-center"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description *</label>
            <input
              type="text" placeholder="Ex: Courses Migros"
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
            <label className="text-xs text-gray-400 mb-1 block">
              {form.is_transfer ? 'De' : 'Payé par'} *
            </label>
            <div className="flex gap-2 flex-wrap">
              {users.map(u => (
                <button key={u.id} type="button"
                  onClick={() => set('paid_by', u.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.paid_by === u.id
                      ? 'border-app-accent bg-app-accent/20 text-indigo-700'
                      : 'border-app-border bg-app-surface2 text-gray-500'
                  }`}>
                  <span className="text-lg">{u.emoji}</span>
                  <span style={{ color: u.color }}>{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category (hidden for transfers) */}
          {!form.is_transfer && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                {shownCats.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => set('category_id', form.category_id === c.id ? '' : c.id)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                      form.category_id === c.id
                        ? 'text-gray-900 border-transparent'
                        : 'border-app-border bg-app-surface2 text-gray-500'
                    }`}
                    style={form.category_id === c.id ? { background: c.color + '40', borderColor: c.color } : {}}>
                    <span>{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account */}
          {accounts.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {form.is_transfer ? 'Compte source' : 'Compte bancaire'}
              </label>
              <select value={form.account_id} onChange={e => set('account_id', e.target.value)}
                className="input-field">
                <option value="">— Aucun compte —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Split — only for expenses */}
          {!form.is_income && !form.is_transfer && users.length > 1 && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Répartition</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button"
                  onClick={() => setSplitFor('none')}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    splitFor === 'none'
                      ? 'bg-app-accent text-white border-app-accent'
                      : 'bg-app-surface2 text-gray-400 border-app-border'
                  }`}>
                  Aucune
                </button>
                {users.map(u => (
                  <button key={u.id} type="button"
                    onClick={() => setSplitFor(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      splitFor === u.id
                        ? 'border-app-accent bg-app-accent/20 text-indigo-700'
                        : 'bg-app-surface2 text-gray-400 border-app-border'
                    }`}>
                    <span>{u.emoji}</span>
                    <span style={{ color: u.color }}>{u.name}</span>
                  </button>
                ))}
                <button type="button"
                  onClick={() => setSplitFor('all')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    splitFor === 'all'
                      ? 'border-app-accent bg-app-accent/20 text-indigo-700'
                      : 'bg-app-surface2 text-gray-400 border-app-border'
                  }`}>
                  👫 Les deux
                </button>
              </div>
              {splitFor !== 'none' && form.amount && !isNaN(amtNum) && (
                <p className="text-xs text-gray-400 mt-2">
                  {splitFor === 'all'
                    ? users.map(u => `${u.emoji} ${u.name}: ${(amtNum / users.length).toFixed(2)} CHF`).join(' · ')
                    : (() => {
                        const u = users.find(x => x.id === splitFor)
                        return u ? `${u.emoji} ${u.name}: ${amtNum.toFixed(2)} CHF` : ''
                      })()
                  }
                </p>
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
