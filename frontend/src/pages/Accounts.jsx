import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAccounts, createAccount, updateAccount, deleteAccount, getUsers } from '../api'

const ICONS  = ['🏦','💳','💰','🏧','💵','🏠','📊','🐷','💼','📈']
const COLORS = ['#10b981','#6366f1','#3b82f6','#f97316','#ec4899','#a855f7','#ef4444','#eab308','#14b8a6','#84cc16']

function AccountFormModal({ account, users, onSave, onClose }) {
  const [form, setForm] = useState({
    name:            account?.name            ?? '',
    type:            account?.type            ?? 'common',
    owner_id:        account?.owner_id        ?? '',
    color:           account?.color           ?? '#10b981',
    icon:            account?.icon            ?? '🏦',
    initial_balance: account?.initial_balance ?? 0,
  })
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.name) { toast.error('Nom requis'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        owner_id:        form.owner_id ? parseInt(form.owner_id) : null,
        initial_balance: parseFloat(form.initial_balance) || 0,
      }
      if (account) await updateAccount(account.id, payload)
      else          await createAccount(payload)
      toast.success(account ? 'Compte modifié' : 'Compte créé')
      onSave()
    } catch { toast.error('Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-app-surface">
          <h2 className="text-lg font-bold">{account ? 'Modifier le compte' : 'Nouveau compte'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="px-5 pb-8 space-y-4">
          {/* Icon picker */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Icône</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(ico => (
                <button key={ico} type="button"
                  onClick={() => set('icon', ico)}
                  className={`w-10 h-10 rounded-xl text-xl border transition-all ${
                    form.icon === ico ? 'border-app-accent bg-app-accent/20' : 'border-app-border bg-app-surface2'
                  }`}>
                  {ico}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nom du compte *</label>
            <input type="text" placeholder="Ex: Compte commun BNP"
              value={form.name} onChange={e => set('name', e.target.value)}
              className="input-field" autoFocus />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Type de compte</label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => { set('type', 'common'); set('owner_id', '') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.type === 'common' ? 'border-app-accent bg-app-accent/20 text-white' : 'border-app-border bg-app-surface2 text-gray-400'
                }`}>
                👫 Commun
              </button>
              <button type="button"
                onClick={() => set('type', 'personal')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.type === 'personal' ? 'border-app-accent bg-app-accent/20 text-white' : 'border-app-border bg-app-surface2 text-gray-400'
                }`}>
                👤 Personnel
              </button>
            </div>
          </div>

          {/* Owner (if personal) */}
          {form.type === 'personal' && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Propriétaire</label>
              <div className="flex gap-2 flex-wrap">
                {users.map(u => (
                  <button key={u.id} type="button"
                    onClick={() => set('owner_id', u.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                      form.owner_id === u.id || form.owner_id === String(u.id)
                        ? 'border-app-accent bg-app-accent/20 text-white'
                        : 'border-app-border bg-app-surface2 text-gray-300'
                    }`}>
                    <span className="text-lg">{u.emoji}</span>
                    <span style={{ color: u.color }}>{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-app-surface scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Initial balance */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Solde initial (€)</label>
            <input type="number" step="0.01" placeholder="0.00"
              value={form.initial_balance}
              onChange={e => set('initial_balance', e.target.value)}
              className="input-field" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Enregistrement...' : account ? '✓ Modifier' : '+ Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [users, setUsers]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState(null)

  function load() {
    Promise.all([getAccounts(), getUsers()]).then(([a, u]) => { setAccounts(a); setUsers(u) })
  }
  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('Supprimer ce compte ?')) return
    await deleteAccount(id)
    toast.success('Compte supprimé')
    load()
  }

  const common   = accounts.filter(a => a.type === 'common')
  const personal = accounts.filter(a => a.type === 'personal')

  return (
    <div className="page-padding">
      <div className="pt-2 mb-5">
        <h1 className="text-2xl font-bold">Comptes</h1>
        <p className="text-gray-400 text-sm mt-1">Gérez vos comptes bancaires</p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">🏦</p>
          <p>Aucun compte configuré</p>
          <p className="text-sm mt-1">Ajoutez vos comptes bancaires</p>
        </div>
      ) : (
        <div className="space-y-5">
          {common.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">👫 Comptes communs</h2>
              <div className="space-y-2">
                {common.map(a => (
                  <AccountCard key={a.id} account={a} users={users}
                    onEdit={() => { setEditAccount(a); setShowForm(true) }}
                    onDelete={() => handleDelete(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {personal.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">👤 Comptes personnels</h2>
              <div className="space-y-2">
                {personal.map(a => (
                  <AccountCard key={a.id} account={a} users={users}
                    onEdit={() => { setEditAccount(a); setShowForm(true) }}
                    onDelete={() => handleDelete(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={() => { setEditAccount(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-app-accent rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all z-30">
        <Plus size={26} />
      </button>

      {showForm && (
        <AccountFormModal
          account={editAccount}
          users={users}
          onSave={() => { setShowForm(false); setEditAccount(null); load() }}
          onClose={() => { setShowForm(false); setEditAccount(null) }}
        />
      )}
    </div>
  )
}

function AccountCard({ account, users, onEdit, onDelete }) {
  const owner = account.owner_id ? users.find(u => u.id === account.owner_id) : null
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: account.color + '25', border: `2px solid ${account.color}50` }}>
        {account.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{account.name}</p>
        <p className="text-sm text-gray-500">
          {account.type === 'common' ? '👫 Commun' : owner ? `${owner.emoji} ${owner.name}` : '👤 Personnel'}
        </p>
        {account.initial_balance !== 0 && (
          <p className="text-xs text-gray-600 mt-0.5">Solde initial: {account.initial_balance.toFixed(2)}€</p>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-2 rounded-xl hover:bg-app-surface2 text-gray-500 hover:text-white transition-colors">
          <Pencil size={15} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
