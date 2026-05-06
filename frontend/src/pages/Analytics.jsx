import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getByCategory, getMonthly, getByUser, getSummary } from '../api'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
function fmt(n) { return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n ?? 0) }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-app-surface border border-app-border rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth() + 1)
  const [tab, setTab]         = useState('monthly')
  const [monthly, setMonthly] = useState([])
  const [byCat, setByCat]     = useState([])
  const [byUser, setByUser]   = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    Promise.all([
      getMonthly({ year }),
      getByCategory({ year, month }),
      getByUser({ year, month }),
      getSummary({ year, month }),
    ]).then(([m, c, u, s]) => {
      setMonthly(m.map((x, i) => ({ ...x, name: MONTHS[i] })))
      setByCat(c.filter(x => x.total > 0))
      setByUser(u)
      setSummary(s)
    })
  }, [year, month])

  // Also refresh byCat / byUser when month changes
  useEffect(() => {
    Promise.all([
      getByCategory({ year, month }),
      getByUser({ year, month }),
      getSummary({ year, month }),
    ]).then(([c, u, s]) => {
      setByCat(c.filter(x => x.total > 0))
      setByUser(u)
      setSummary(s)
    })
  }, [month])

  const tabs = [
    { id: 'monthly',  label: 'Annuel' },
    { id: 'category', label: 'Catégories' },
    { id: 'users',    label: 'Par personne' },
  ]

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr })

  return (
    <div className="page-padding">
      <div className="pt-2 mb-5">
        <h1 className="text-2xl font-bold">Analyse</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-surface rounded-xl mb-5 border border-app-border">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-app-accent text-white shadow' : 'text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Year picker */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl hover:bg-app-surface2">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold">{year}</span>
        <button onClick={() => setYear(y => y + 1)} disabled={year >= now.getFullYear()}
          className="p-2 rounded-xl hover:bg-app-surface2 disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Month picker (for cat/user tabs) */}
      {tab !== 'monthly' && (
        <div className="flex items-center justify-between mb-4 bg-app-surface2 rounded-xl px-3 py-2 border border-app-border">
          <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-1"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
          <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
            disabled={month === now.getMonth() + 1 && year === now.getFullYear()}
            className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}

      {/* MONTHLY TAB */}
      {tab === 'monthly' && (
        <div className="space-y-5">
          {/* Bar chart */}
          <div className="surface-card p-4">
            <h3 className="font-semibold mb-4">Dépenses vs Revenus ({year})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="income"   name="Revenus"  fill="#22c55e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Balance line */}
          <div className="surface-card p-4">
            <h3 className="font-semibold mb-4">Balance mensuelle ({year})</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#475569" />
                <Line type="monotone" dataKey="balance" name="Balance"
                  stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly totals table */}
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border bg-app-surface2">
                  <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Mois</th>
                  <th className="text-right px-4 py-2.5 text-red-400 font-medium">Dépenses</th>
                  <th className="text-right px-4 py-2.5 text-green-400 font-medium">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={i} className="border-b border-app-border last:border-0 hover:bg-app-surface2">
                    <td className="px-4 py-2.5 font-medium">{m.name}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmt(m.expenses)}</td>
                    <td className="px-4 py-2.5 text-right text-green-400">{fmt(m.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY TAB */}
      {tab === 'category' && (
        <div className="space-y-5">
          {summary && (
            <div className="surface-card p-4">
              <p className="text-gray-400 text-sm mb-1">Total dépenses {monthLabel}</p>
              <p className="text-3xl font-bold text-red-400">
                {fmt(summary.total_expenses)}
              </p>
            </div>
          )}

          {byCat.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Aucune dépense ce mois</div>
          ) : (
            <>
              {/* Pie chart */}
              <div className="surface-card p-4">
                <h3 className="font-semibold mb-4">Répartition par catégorie</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byCat} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {byCat.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => fmt(val)} contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
                    <Legend
                      formatter={(value, entry) => (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{entry.payload.icon} {value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category list */}
              <div className="surface-card divide-y divide-app-border overflow-hidden">
                {byCat.map(cat => {
                  const totalExp = byCat.reduce((s, c) => s + c.total, 0)
                  const pct = totalExp > 0 ? (cat.total / totalExp) * 100 : 0
                  return (
                    <div key={cat.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-lg">{cat.icon}</span>
                          {cat.name}
                        </span>
                        <div className="text-right">
                          <span className="font-bold">{fmt(cat.total)}</span>
                          <span className="text-xs text-gray-500 ml-2">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-app-surface2 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-5">
          {byUser.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Aucune donnée</div>
          ) : (
            <>
              <div className="surface-card p-4">
                <h3 className="font-semibold mb-4">Dépenses par personne</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byUser} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="paid" name="A payé" radius={[6,6,0,0]}>
                      {byUser.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="surface-card divide-y divide-app-border overflow-hidden">
                {byUser.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ background: u.color + '30', border: `2px solid ${u.color}` }}>
                      {u.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: u.color }}>{u.name}</p>
                      <p className="text-xs text-gray-500">{u.count} dépenses</p>
                    </div>
                    <span className="font-bold text-lg">{fmt(u.paid)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
