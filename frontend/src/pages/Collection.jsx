import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Filter, Search, Upload, ChevronDown, X, Pencil, Trash2, MapPin } from 'lucide-react'
import { getCollection, getLocations, deleteCollectionEntry, getCollectionStats } from '../api'
import CardImage from '../components/CardImage'
import { LocationBadge, ProxyBadge, ColorIdentity, RarityBadge } from '../components/LocationBadge'
import CollectionEntryModal from '../components/CollectionEntry'
import ImportCSV from '../components/ImportCSV'
import toast from 'react-hot-toast'

function CollectionCard({ entry, onEdit, onDelete }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="relative">
        <CardImage
          card={entry}
          size="small"
          className="w-full aspect-[5/7] object-cover"
        />
        {entry.foil && (
          <div className="absolute top-1 left-1 bg-yellow-500/80 rounded px-1 text-[9px] font-bold text-black">
            FOIL
          </div>
        )}
        {entry.quantity > 1 && (
          <div className="absolute bottom-1 right-1 bg-black/80 rounded-full w-5 h-5 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{entry.quantity}</span>
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-gray-100 truncate">{entry.name}</p>
        <div className="flex items-center gap-1 flex-wrap">
          {entry.is_proxy && <ProxyBadge />}
          {entry.location_name && (
            <span className="badge-location text-[9px] px-1.5 py-0.5">
              <MapPin size={8} />
              {entry.location_name.replace('Staples ', '').replace('Rangement ', '').replace('Légendaires ', 'Leg. ').replace('Binder ', '')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(entry)}
              className="p-1 rounded hover:bg-app-border transition-colors text-gray-400 hover:text-gray-200"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={() => onDelete(entry)}
              className="p-1 rounded hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-400"
            >
              <Trash2 size={11} />
            </button>
          </div>
          <RarityBadge rarity={entry.rarity} />
        </div>
      </div>
    </div>
  )
}

export default function CollectionPage() {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    location_id: '',
    search: '',
    foil: '',
    is_proxy: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 50 }
      if (filters.location_id) params.location_id = filters.location_id
      if (filters.search) params.search = filters.search
      if (filters.foil !== '') params.foil = filters.foil === 'true'
      if (filters.is_proxy !== '') params.is_proxy = filters.is_proxy === 'true'
      const d = await getCollection(params)
      setEntries(d.data || [])
      setTotal(d.total || 0)
      setPage(p)
    } catch (e) {
      toast.error('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadStats = useCallback(async () => {
    try {
      const s = await getCollectionStats()
      setStats(s)
    } catch (e) {}
  }, [])

  useEffect(() => {
    getLocations().then(d => setLocations(d.data || []))
    loadStats()
  }, [loadStats])

  useEffect(() => {
    load(1)
  }, [load])

  const handleDelete = async (entry) => {
    if (!confirm(`Remove ${entry.name} from collection?`)) return
    try {
      await deleteCollectionEntry(entry.id)
      toast.success('Removed from collection')
      load(page)
      loadStats()
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (entry) => {
    setEditEntry(entry)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-app-surface border-b border-app-border safe-top">
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-app-accent2" />
              <h1 className="text-lg font-bold">My Collection</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="p-2 rounded-lg hover:bg-app-border transition-colors text-gray-400 hover:text-gray-200"
                title="Import from Manabox"
              >
                <Upload size={18} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-purple-900/30 text-app-accent2' : 'hover:bg-app-border text-gray-400'
                }`}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{stats.unique_entries} unique cards</span>
              <span>·</span>
              <span>{stats.total_cards} total</span>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search by name..."
                    className="input-field pl-7 text-sm"
                  />
                </div>
                <select
                  value={filters.location_id}
                  onChange={e => setFilters(f => ({ ...f, location_id: e.target.value }))}
                  className="input-field text-sm flex-1"
                >
                  <option value="">All locations</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <select
                  value={filters.foil}
                  onChange={e => setFilters(f => ({ ...f, foil: e.target.value }))}
                  className="input-field text-sm flex-1"
                >
                  <option value="">All</option>
                  <option value="true">Foil only</option>
                  <option value="false">Non-foil</option>
                </select>
                <select
                  value={filters.is_proxy}
                  onChange={e => setFilters(f => ({ ...f, is_proxy: e.target.value }))}
                  className="input-field text-sm flex-1"
                >
                  <option value="">All</option>
                  <option value="false">Owned</option>
                  <option value="true">Proxies</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No cards yet</p>
            <p className="text-sm mt-1">Search for cards and add them to your collection</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{total} entries</p>
            <div className="card-grid">
              {entries.map(entry => (
                <CollectionCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            {total > entries.length && (
              <button
                onClick={() => load(page + 1)}
                className="btn-secondary w-full mt-4"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* Edit modal */}
      {editEntry && (
        <CollectionEntryModal
          card={editEntry}
          existingEntry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); load(page); loadStats() }}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportCSV
          onClose={() => setShowImport(false)}
          onImported={() => { load(1); loadStats() }}
        />
      )}
    </div>
  )
}
