import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { getUsers, createUser, updateUser, deleteUser, getCategories, createCategory, deleteCategory } from '../api'

const EMOJIS = ['👤','👨','👩','🧑','😊','😎','🦄','🐼','🐸','🦊','🎩','🌟','⚡','🔥','💎']
const COLORS = ['#6366f1','#ec4899','#f97316','#22c55e','#3b82f6','#a855f7','#ef4444','#14b8a6','#eab308','#84cc16']

function UserFormModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name:  user?.name  ?? '',
    color: user?.color ?? '#6366f1',
    emoji: user?.emoji ?? '👤',
  })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setLoading(true)
    try {
      if (user) await updateUser(user.id, form)
      else       await createUser(form)
      toast.success(user ? 'Profil modifié' : 'Utilisateur créé')
      onSave()
    } catch { toast.error('Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">{user ? 'Modifier le profil' : 'Nouvel utilisateur'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="px-5 pb-8 space-y-5">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4"
              style={{ borderColor: form.color, background: form.color + '20' }}>
              {form.emoji}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Prénom *</label>
            <input type="text" placeholder="Ex: Thomas"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field" autoFocus />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(em => (
                <button key={em} type="button"
                  onClick={() => setForm(f => ({ ...f, emoji: em }))}
                  className={`w-10 h-10 rounded-xl text-xl border transition-all ${
                    form.emoji === em ? 'border-app-accent bg-app-accent/20 scale-110' : 'border-app-border bg-app-surface2'
                  }`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-9 h-9 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-app-surface scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Enregistrement...' : user ? '✓ Modifier' : '+ Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CategoryFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', icon: '💰', color: '#6366f1', is_income: false })
  const [loading, setLoading] = useState(false)

  const PRESET_ICONS = ['🏠','🛒','🍽️','🍺','🚌','🚗','🏥','🛍️','📱','🎮','✈️','🎁','📈','🐷','📦','💼','💳','💰']

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setLoading(true)
    try {
      await createCategory(form)
      toast.success('Catégorie créée')
      onSave()
    } catch { toast.error('Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-app-surface rounded-t-3xl border-t border-app-border">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">Nouvelle catégorie</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-surface2"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="px-5 pb-8 space-y-4">
          <div className="flex gap-3 items-center p-3 rounded-xl border border-app-border bg-app-surface2">
            <span className="text-3xl">{form.icon}</span>
            <input type="text" placeholder="Nom de la catégorie"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-transparent flex-1 outline-none text-white placeholder-gray-500" autoFocus />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">Icône</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button"
                  onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={`w-10 h-10 rounded-xl text-xl border transition-all ${
                    form.icon === ic ? 'border-app-accent bg-app-accent/20' : 'border-app-border bg-app-surface2'
                  }`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${form.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-app-surface scale-110' : ''}`}
                style={{ background: c }} />
            ))}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, is_income: false }))}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                !form.is_income ? 'border-app-accent bg-app-accent/20 text-white' : 'border-app-border bg-app-surface2 text-gray-400'
              }`}>
              💸 Dépense
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_income: true }))}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                form.is_income ? 'border-app-accent bg-app-accent/20 text-white' : 'border-app-border bg-app-surface2 text-gray-400'
              }`}>
              💰 Revenu
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Enregistrement...' : '+ Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Settings() {
  const [users, setUsers]         = useState([])
  const [categories, setCategories] = useState([])
  const [showUserForm, setShowUserForm]   = useState(false)
  const [showCatForm, setShowCatForm]     = useState(false)
  const [editUser, setEditUser]           = useState(null)
  const [tab, setTab]                     = useState('users')

  function load() {
    getUsers().then(setUsers)
    getCategories().then(setCategories)
  }
  useEffect(() => { load() }, [])

  async function handleDeleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ? Ses dépenses resteront.')) return
    await deleteUser(id)
    toast.success('Utilisateur supprimé')
    load()
  }

  async function handleDeleteCat(id) {
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      await deleteCategory(id)
      toast.success('Catégorie supprimée')
      load()
    } catch (e) {
      toast.error(e.message || 'Impossible de supprimer')
    }
  }

  const expCats = categories.filter(c => !c.is_income)
  const incCats = categories.filter(c => c.is_income)

  return (
    <div className="page-padding">
      <div className="pt-2 mb-5">
        <h1 className="text-2xl font-bold">Réglages</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-surface rounded-xl mb-5 border border-app-border">
        {[{id:'users',label:'👤 Profils'},{id:'categories',label:'🏷️ Catégories'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-app-accent text-white shadow' : 'text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* USERS */}
      {tab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Membres du foyer</h2>
            <button onClick={() => { setEditUser(null); setShowUserForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-app-accent rounded-xl text-sm font-medium active:scale-95 transition-all">
              <Plus size={14} /> Ajouter
            </button>
          </div>

          {users.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-4xl mb-2">👥</p>
              <p>Aucun utilisateur</p>
              <p className="text-sm mt-1">Commencez par ajouter les membres</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="surface-card flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
                    style={{ borderColor: u.color, background: u.color + '20' }}>
                    {u.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: u.color }}>{u.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditUser(u); setShowUserForm(true) }}
                      className="p-2 rounded-xl hover:bg-app-surface2 text-gray-500 hover:text-white transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="p-2 rounded-xl hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 surface-card p-4">
            <h3 className="font-semibold mb-2 text-sm">💡 Comment commencer</h3>
            <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>Ajoutez les 2 membres du foyer (vous et votre compagne)</li>
              <li>Créez vos comptes bancaires (Comptes)</li>
              <li>Commencez à saisir vos dépenses</li>
            </ol>
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {tab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Catégories</h2>
            <button onClick={() => setShowCatForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-app-accent rounded-xl text-sm font-medium active:scale-95 transition-all">
              <Plus size={14} /> Ajouter
            </button>
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">💸 Dépenses</h3>
          <div className="surface-card divide-y divide-app-border overflow-hidden mb-4">
            {expCats.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{c.icon}</span>
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                {c.id > 18 && (
                  <button onClick={() => handleDeleteCat(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">💰 Revenus</h3>
          <div className="surface-card divide-y divide-app-border overflow-hidden">
            {incCats.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{c.icon}</span>
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                {c.id > 18 && (
                  <button onClick={() => handleDeleteCat(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showUserForm && (
        <UserFormModal user={editUser}
          onSave={() => { setShowUserForm(false); setEditUser(null); load() }}
          onClose={() => { setShowUserForm(false); setEditUser(null) }}
        />
      )}

      {showCatForm && (
        <CategoryFormModal
          onSave={() => { setShowCatForm(false); load() }}
          onClose={() => setShowCatForm(false)}
        />
      )}
    </div>
  )
}
