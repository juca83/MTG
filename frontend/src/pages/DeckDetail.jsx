import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, BarChart2, AlertTriangle,
  Package, Search, X, ChevronDown, BookOpen, Pencil
} from 'lucide-react'
import {
  getDeck, getDeckEntries, addDeckEntry, deleteDeckEntry, updateDeck,
  getDeckAnalysis, getDeckMissing, getDeckRefile, searchCards, deleteDeck
} from '../api'
import CardImage from '../components/CardImage'
import DeckAnalysis from '../components/DeckAnalysis'
import { LocationBadge, ProxyBadge, ColorIdentity } from '../components/LocationBadge'
import CollectionEntryModal from '../components/CollectionEntry'
import toast from 'react-hot-toast'
import { searchCards as apiSearch } from '../api'

const STATUS_LABELS = {
  to_do: 'À faire',
  in_progress: 'En cours',
  archived: 'Vieux deck',
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-app-accent2 text-app-accent2'
          : 'border-transparent text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function DeckEntry({ entry, onDelete }) {
  const isOwned = !!entry.collection_entry_id
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-app-border/50 ${!isOwned ? 'opacity-60' : ''}`}>
      <div className="w-8 h-11 flex-shrink-0 relative">
        {entry.image_uri_small ? (
          <img src={entry.image_uri_small} alt={entry.name} className="w-full h-full object-cover rounded" />
        ) : (
          <div className="w-full h-full bg-app-surface2 rounded flex items-center justify-center">
            <span className="text-[8px] text-gray-500">{entry.name?.[0]}</span>
          </div>
        )}
        {!isOwned && (
          <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
            <AlertTriangle size={10} className="text-orange-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-100 truncate">{entry.name}</span>
          {entry.is_commander && (
            <span className="text-[9px] bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-800/40">CMD</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>{entry.type_line?.split('—')[0].trim()}</span>
          {entry.cmc !== null && <span>CMC {entry.cmc}</span>}
          {entry.location_name && (
            <span className="text-blue-400 truncate">{entry.location_name}</span>
          )}
          {entry.is_proxy && <ProxyBadge />}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-bold text-gray-300 w-5 text-center">{entry.quantity}</span>
        <button
          onClick={() => onDelete(entry)}
          className="p-1.5 rounded hover:bg-red-900/30 text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function AddCardModal({ deckId, onClose, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const d = await apiSearch(query)
      setResults(d.data || [])
    } catch (e) {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const addCard = async (card, board = 'main') => {
    try {
      await addDeckEntry(deckId, {
        scryfall_id: card.id,
        quantity: 1,
        board,
        is_commander: false,
      })
      toast.success(`Added ${card.name}`)
      onAdded?.()
    } catch (e) {
      toast.error('Failed to add card')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col">
      <div className="bg-app-surface border-b border-app-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-border">
            <X size={18} />
          </button>
          <h2 className="font-semibold">Add Card to Deck</h2>
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search for a card..."
            className="input-field flex-1 text-sm"
            autoFocus
          />
          <button onClick={doSearch} disabled={loading} className="btn-primary px-4 text-sm">
            {loading ? '...' : <Search size={16} />}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map(card => (
              <div key={card.id} className="flex items-center gap-3 surface-card p-3">
                {card.image_uri_small && (
                  <img src={card.image_uri_small} alt={card.name} className="w-8 h-11 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-xs text-gray-400">{card.type_line}</p>
                  {card.in_collection && (
                    <p className="text-xs text-green-400">In collection</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => addCard(card, 'main')}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Main
                  </button>
                  <button
                    onClick={() => addCard(card, 'side')}
                    className="btn-secondary text-xs py-1.5 px-2"
                  >
                    Side
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MissingCards({ deckId }) {
  const [missing, setMissing] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeckMissing(deckId).then(d => {
      setMissing(d.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [deckId])

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent"></div>
    </div>
  )

  if (missing.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package size={40} className="mx-auto mb-3 opacity-30" />
        <p>All cards owned!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {missing.map(card => (
        <div key={card.id} className="surface-card p-3">
          <div className="flex gap-3 mb-3">
            <div className="relative w-10 h-14 flex-shrink-0">
              {card.image_uri_small ? (
                <img src={card.image_uri_small} alt={card.name} className="w-full h-full object-cover rounded" />
              ) : (
                <div className="w-full h-full bg-app-surface2 rounded" />
              )}
              <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                <AlertTriangle size={12} className="text-orange-400" />
              </div>
            </div>
            <div>
              <p className="font-medium text-sm">{card.name}</p>
              <p className="text-xs text-gray-400">{card.type_line}</p>
              {card.price_usd && <p className="text-xs text-green-400">${card.price_usd}</p>}
              <p className="text-xs text-orange-300">Missing {card.quantity}x</p>
            </div>
          </div>
          {card.similar_in_collection?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Similar in collection:</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {card.similar_in_collection.map(s => (
                  <div key={s.entry_id || s.id} className="flex-shrink-0 text-center w-16">
                    {s.image_uri_small ? (
                      <img src={s.image_uri_small} alt={s.name} className="w-16 h-22 object-cover rounded mb-1" />
                    ) : (
                      <div className="w-16 h-22 bg-app-surface2 rounded mb-1" />
                    )}
                    <p className="text-[9px] text-gray-400 truncate">{s.name}</p>
                    <p className="text-[9px] text-purple-400">{Math.round(s.score)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RefileGuide({ deckId, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeckRefile(deckId).then(d => {
      setItems(d.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [deckId])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-app-border flex-shrink-0">
          <h2 className="font-semibold">Refile Guide</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-border"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-app-border/30">
                  {item.image_uri_small && (
                    <img src={item.image_uri_small} alt={item.name} className="w-7 h-10 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{item.quantity}x {item.name}</p>
                    {item.location_name ? (
                      <p className="text-xs text-blue-400">{item.location_name}</p>
                    ) : (
                      <p className="text-xs text-gray-500">No location</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-app-border flex-shrink-0">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function DeckDetailPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState(null)
  const [entries, setEntries] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cards')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showRefile, setShowRefile] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)

  const loadDeck = useCallback(async () => {
    try {
      const d = await getDeck(parseInt(deckId))
      setDeck(d)
    } catch (e) {
      toast.error('Deck not found')
      navigate('/decks')
    }
  }, [deckId])

  const loadEntries = useCallback(async () => {
    try {
      const d = await getDeckEntries(parseInt(deckId))
      setEntries(d.data || [])
    } catch (e) {}
  }, [deckId])

  const loadAnalysis = useCallback(async () => {
    try {
      const d = await getDeckAnalysis(parseInt(deckId))
      setAnalysis(d)
    } catch (e) {}
  }, [deckId])

  useEffect(() => {
    Promise.all([loadDeck(), loadEntries()]).finally(() => setLoading(false))
  }, [loadDeck, loadEntries])

  useEffect(() => {
    if (tab === 'analysis' && !analysis) {
      loadAnalysis()
    }
  }, [tab, analysis, loadAnalysis])

  const handleDeleteEntry = async (entry) => {
    try {
      await deleteDeckEntry(parseInt(deckId), entry.id)
      toast.success('Removed from deck')
      loadEntries()
      loadDeck()
    } catch (e) {
      toast.error('Failed to remove')
    }
  }

  const handleDeleteDeck = async () => {
    if (!confirm(`Delete deck "${deck?.name}"? This cannot be undone.`)) return
    try {
      await deleteDeck(parseInt(deckId))
      toast.success('Deck deleted')
      navigate('/decks')
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  const handleStatusChange = async (status) => {
    try {
      const updated = await updateDeck(parseInt(deckId), { status })
      setDeck(updated)
      setEditingStatus(false)
    } catch (e) {
      toast.error('Failed to update')
    }
  }

  // Group entries by type
  const grouped = entries.reduce((acc, e) => {
    const tl = (e.type_line || '').toLowerCase()
    let cat = 'Other'
    if (e.is_commander) cat = 'Commander'
    else if (tl.includes('creature')) cat = 'Creatures'
    else if (tl.includes('instant')) cat = 'Instants'
    else if (tl.includes('sorcery')) cat = 'Sorceries'
    else if (tl.includes('enchantment')) cat = 'Enchantments'
    else if (tl.includes('artifact')) cat = 'Artifacts'
    else if (tl.includes('planeswalker')) cat = 'Planeswalkers'
    else if (tl.includes('land')) cat = 'Lands'

    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  const mainEntries = entries.filter(e => e.board === 'main')
  const sideEntries = entries.filter(e => e.board === 'side')
  const ownedCount = mainEntries.filter(e => e.collection_entry_id).reduce((s, e) => s + e.quantity, 0)
  const totalCount = mainEntries.reduce((s, e) => s + e.quantity, 0)

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-app-surface border-b border-app-border safe-top">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/decks')} className="p-1.5 rounded-lg hover:bg-app-border">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{deck?.name}</h1>
              <div className="flex items-center gap-2 text-xs">
                {deck?.format && <span className="text-gray-400">{deck.format}</span>}
                <button
                  onClick={() => setEditingStatus(!editingStatus)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] ${
                    deck?.status === 'in_progress' ? 'text-green-400 border-green-800/40 bg-green-900/20' :
                    deck?.status === 'to_do' ? 'text-yellow-400 border-yellow-800/40 bg-yellow-900/20' :
                    'text-gray-400 border-gray-700 bg-gray-800/30'
                  }`}
                >
                  {STATUS_LABELS[deck?.status] || deck?.status}
                </button>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowRefile(true)}
                className="p-1.5 rounded-lg hover:bg-app-border text-gray-400 hover:text-gray-200"
                title="Refile guide"
              >
                <Package size={18} />
              </button>
              <button
                onClick={handleDeleteDeck}
                className="p-1.5 rounded-lg hover:bg-red-900/20 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Status picker */}
          {editingStatus && (
            <div className="flex gap-2 mb-2">
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleStatusChange(val)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    deck?.status === val
                      ? 'bg-app-accent text-white'
                      : 'bg-app-surface2 border border-app-border text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>{totalCount} cards</span>
            {deck?.missing_count > 0 && (
              <span className="text-orange-400">{deck.missing_count} missing</span>
            )}
            {totalCount > 0 && (
              <div className="flex-1 bg-app-surface2 rounded-full h-1.5 ml-1">
                <div
                  className="h-full bg-green-600 rounded-full"
                  style={{ width: `${totalCount > 0 ? (ownedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex -mb-px">
            <TabButton active={tab === 'cards'} onClick={() => setTab('cards')}>
              Cards
            </TabButton>
            <TabButton active={tab === 'analysis'} onClick={() => setTab('analysis')}>
              Analysis
            </TabButton>
            <TabButton active={tab === 'missing'} onClick={() => setTab('missing')}>
              Missing {deck?.missing_count > 0 && <span className="ml-1 text-orange-400">({deck.missing_count})</span>}
            </TabButton>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'cards' && (
          <div>
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p>No cards yet</p>
                <p className="text-sm">Tap + to add cards</p>
              </div>
            ) : (
              <>
                {Object.entries(grouped).map(([cat, catEntries]) => {
                  const mainCat = catEntries.filter(e => e.board === 'main')
                  if (mainCat.length === 0) return null
                  return (
                    <div key={cat} className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {cat} ({mainCat.reduce((s, e) => s + e.quantity, 0)})
                      </p>
                      {mainCat.map(e => (
                        <DeckEntry key={e.id} entry={e} onDelete={handleDeleteEntry} />
                      ))}
                    </div>
                  )
                })}
                {sideEntries.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Sideboard ({sideEntries.reduce((s, e) => s + e.quantity, 0)})
                    </p>
                    {sideEntries.map(e => (
                      <DeckEntry key={e.id} entry={e} onDelete={handleDeleteEntry} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'analysis' && (
          <DeckAnalysis analysis={analysis} />
        )}

        {tab === 'missing' && (
          <MissingCards deckId={parseInt(deckId)} />
        )}
      </div>

      {/* FAB */}
      {tab === 'cards' && (
        <button
          onClick={() => setShowAddCard(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-app-accent hover:bg-app-accent2 rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        >
          <Plus size={24} />
        </button>
      )}

      {showAddCard && (
        <AddCardModal
          deckId={parseInt(deckId)}
          onClose={() => setShowAddCard(false)}
          onAdded={() => { loadEntries(); loadDeck() }}
        />
      )}

      {showRefile && (
        <RefileGuide deckId={parseInt(deckId)} onClose={() => setShowRefile(false)} />
      )}
    </div>
  )
}
