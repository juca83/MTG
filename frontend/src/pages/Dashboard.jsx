import { useState, useEffect } from 'react'
import { Plus, TrendingDown, TrendingUp, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSummary, getExpenses, getBalances, getByCategory } from '../api'
import ExpenseForm from '../components/ExpenseForm'

function fmt(n) { return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n ?? 0) }

function MonthPicker({ date, onChange }) {
  function prev() { onChange(new Date(date.getFullYear(), date.getMonth() - 1, 1)) }
  function next() { onChange(new Date(date.getFullYear(), date.getMonth() + 1, 1)) }
  const isCurrentMonth = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-app-surface2 transition-colors"><ChevronLeft size={18} /></button>
      <span className="font-semibold capitalize min-w-[120px] text-center">
        {format(date, 'MMMM yyyy', { locale: fr })}
      </span>
      <button onClick={next} disabled={isCurrentMonth} className="p-1.5 rounded-lg hover:bg-app-surface2 transition-colors disabled:opacity-30"><ChevronRight size={18} /></button>
    </div>
  )
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [summary, setSummary]   = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState(null)
  const [byCat, setByCat]       = useState([])
  const [showForm, setShowForm] = useState(false)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  function load() {
    const p = { year, month }
    Promise.all([
      getSummary(p),
      getExpenses({ limit: 5 }),
      getBalances(),
      getByCategory(p),
    ]).then(([s, e, b, c]) => {
      setSummary(s)
      setExpenses(e)
      setBalances(b)
      setByCat(c.filter(x => x.total > 0).slice(0, 5))
    })
  }

  useEffect(() => { load() }, [year, month])

  const top3 = byCat.slice(0, 3)
  const totalExpenses = summary?.total_expenses ?? 0
  const debts = balances?.debts ?? []
  const users = balances?.users ?? []

  return (
    <div className="page-padding">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Budget Duo 💑</h1>
          <p className="text-gray-400 text-sm">Vue d'ensemble</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="w-12 h-12 bg-app-accent rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      </div>

      {/* Month picker */}
      <div className="flex justify-center mb-5">
        <MonthPicker date={currentDate} onChange={setCurrentDate} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="surface-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <span className="text-xs text-gray-400">Dépenses</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{fmt(summary?.total_expenses)}</div>
        </div>
        <div className="surface-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-xs text-gray-400">Revenus</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{fmt(summary?.total_income)}</div>
        </div>
      </div>

      {/* Balance */}
      {summary && (
        <div className={`surface-card p-4 mb-5 ${summary.balance >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Balance du mois</span>
            <span className={`text-xl font-bold ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.balance >= 0 ? '+' : ''}{fmt(summary.balance)}
            </span>
          </div>
        </div>
      )}

      {/* Équilibre + derniers échanges */}
      <div className="surface-card p-4 mb-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-app-accent2" />
          Équilibre
        </h2>
        {debts.length === 0 ? (
          <p className="text-sm text-green-500 font-medium mb-3">✓ Tout est à jour</p>
        ) : (
          <div className="mb-3">
            {debts.map((debt, i) => {
              const debtor   = users.find(u => u.id === debt.debtor)
              const creditor = users.find(u => u.id === debt.creditor)
              if (!debtor || !creditor) return null
              return (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-app-border last:border-0">
                  <span className="text-lg">{debtor.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: debtor.color }}>{debtor.name}</span>
                  <span className="text-gray-500 text-xs">doit</span>
                  <span className="font-bold text-app-accent2">{fmt(debt.amount)}</span>
                  <span className="text-gray-500 text-xs">à</span>
                  <span className="text-lg">{creditor.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: creditor.color }}>{creditor.name}</span>
                </div>
              )
            })}
          </div>
        )}

        {expenses.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Derniers échanges</p>
            <div className="space-y-2.5">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: (e.category_color || '#6366f1') + '25' }}>
                    {e.is_transfer ? '🔄' : (e.category_icon || '📦')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{e.description}</p>
                    <p className="text-xs text-gray-400">
                      <span style={{ color: e.paid_by_color }}>{e.paid_by_emoji} {e.paid_by_name}</span>
                      {' · '}
                      <span>{format(new Date(e.date + 'T00:00:00'), 'd MMM', { locale: fr })}</span>
                    </p>
                  </div>
                  <span className={`font-semibold text-xs flex-shrink-0 ${e.is_income ? 'text-green-600' : e.is_transfer ? 'text-blue-600' : 'text-red-500'}`}>
                    {e.is_income ? '+' : e.is_transfer ? '↔' : '-'}{fmt(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Top categories */}
      {top3.length > 0 && (
        <div className="surface-card p-4 mb-5">
          <h2 className="font-semibold mb-3">🏆 Top dépenses</h2>
          {top3.map(cat => (
            <div key={cat.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </span>
                <span className="text-sm font-semibold">{fmt(cat.total)}</span>
              </div>
              <div className="h-1.5 bg-app-surface2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: totalExpenses > 0 ? `${Math.min(100, (cat.total / totalExpenses) * 100)}%` : '0%',
                    background: cat.color
                  }} />
              </div>
            </div>
          ))}
        </div>
      )}


      {showForm && (
        <ExpenseForm onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
