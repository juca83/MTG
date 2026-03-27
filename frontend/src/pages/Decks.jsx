import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, X, ChevronRight, Clock, CheckCircle, Archive } from 'lucide-react'
import { getDecks, createDeck } from '../api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  to_do: { label: 'À faire', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40' },
  in_progress: { label: 'En cours', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20 border-green-800/40' },
  archived: { label: 'Vieux deck', icon: Archive, color: 'text-gray-400', bg: 'bg-gray-800/30 border-gray-700/40' },
}

const FORMATS = ['Commander', 'Standard', 'Modern', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Draft']

const MANA_COLORS = {
  W: { bg: 'bg-yellow-100', text: 'text-yellow-900' },
  U: { bg: 'bg-blue-600', text: 'text-white' },
  B: { bg: 'bg-gray-800 border border-gray-600', text: 'text-white' },
  R: { bg: 'bg-red-600', text: 'text-white' },
  G: { bg: 'bg-green-600', text: 'text-white' },
  C: { bg: 'bg-gray-500', text: 'text-white' },
}

function DeckCard({ deck, onClick }) {
  const status = STATUS_CONFIG[deck.status] || STATUS_CONFIG.in_progress
  const StatusIcon = status.icon

  return (
    <button
      onClick={() => onClick(deck)}
      className={`surface-card p-4 w-full text-left hover:border-app-accent transition-colors flex items-center gap-3`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.bg} ${status.color} flex items-center gap-1`}>
            <StatusIcon size={10} />
            {status.label}
          </span>
          {deck.format && (
            <span className="text-xs text-gray-500">{deck.format}</span>
          )}
        </div>
        <p className="font-semibold text-gray-100 truncate">{deck.name}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>{deck.card_count || 0} cards</span>
          {deck.missing_count > 0 && (
            <span className="text-orange-400">{deck.missing_count} missing</span>
          )}
          {deck.colors?.length > 0 && (
            <div className="flex gap-0.5">
              {deck.colors.map(c => (
                <span
                  key={c}
                  className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${MANA_COLORS[c]?.bg || 'bg-gray-500'} ${MANA_COLORS[c]?.text || 'text-white'}`}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
    </button>
  )
}

function CreateDeckModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    format: 'Commander',
    status: 'in_progress',
    description: '',
    colors: [],
  })
  const [saving, setSaving] = useState(false)

  const toggleColor = (c) => {
    setForm(f => ({
      ...f,
      colors: f.colors.includes(c) ? f.colors.filter(x => x !== c) : [...f.colors, c]
    }))
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Name required')
    setSaving(true)
    try {
      const deck = await createDeck(form)
      toast.success(`Deck "${deck.name}" created`)
      onCreate(deck)
      onClose()
    } catch (e) {
      toast.error('Failed to create deck')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h2 className="font-semibold text-lg">New Deck</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-border">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Deck name..."
              className="input-field"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Format</label>
              <select
                value={form.format}
                onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                className="input-field"
              >
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="input-field"
              >
                <option value="to_do">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="archived">Vieux deck</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Colors</label>
            <div className="flex gap-2">
              {['W','U','B','R','G','C'].map(c => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center transition-all
                    ${MANA_COLORS[c]?.bg || 'bg-gray-500'} ${MANA_COLORS[c]?.text || 'text-white'}
                    ${form.colors.includes(c) ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes about this deck..."
              className="input-field resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Deck'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await getDecks(statusFilter ? { status: statusFilter } : {})
      setDecks(d.data || [])
    } catch (e) {
      toast.error('Failed to load decks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const grouped = {
    in_progress: decks.filter(d => d.status === 'in_progress'),
    to_do: decks.filter(d => d.status === 'to_do'),
    archived: decks.filter(d => d.status === 'archived'),
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-app-surface border-b border-app-border safe-top">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-app-accent2" />
              <h1 className="text-lg font-bold">Decks</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 py-1.5 text-sm">
              <Plus size={16} />
              New Deck
            </button>
          </div>
          {/* Status filter tabs */}
          <div className="flex gap-2">
            {[['', 'All'], ['in_progress', 'En cours'], ['to_do', 'À faire'], ['archived', 'Archives']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  statusFilter === val
                    ? 'bg-app-accent text-white'
                    : 'bg-app-surface2 text-gray-400 hover:text-gray-200 border border-app-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Layers size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No decks yet</p>
            <p className="text-sm mt-1">Create your first deck</p>
          </div>
        ) : (
          <>
            {statusFilter === '' ? (
              Object.entries(grouped).map(([status, statusDecks]) => {
                if (statusDecks.length === 0) return null
                const conf = STATUS_CONFIG[status]
                return (
                  <div key={status}>
                    <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${conf.color}`}>
                      {conf.label} ({statusDecks.length})
                    </h2>
                    <div className="space-y-2">
                      {statusDecks.map(deck => (
                        <DeckCard key={deck.id} deck={deck} onClick={d => navigate(`/decks/${d.id}`)} />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="space-y-2">
                {decks.map(deck => (
                  <DeckCard key={deck.id} deck={deck} onClick={d => navigate(`/decks/${d.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateDeckModal
          onClose={() => setShowCreate(false)}
          onCreate={d => { load() }}
        />
      )}
    </div>
  )
}
