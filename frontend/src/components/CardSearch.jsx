import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { searchCards, autocomplete } from '../api'
import { useDebounce } from '../hooks/useDebounce'

const COLORS = [
  { id: 'W', label: 'White', class: 'bg-yellow-100 text-yellow-900' },
  { id: 'U', label: 'Blue', class: 'bg-blue-600 text-white' },
  { id: 'B', label: 'Black', class: 'bg-gray-800 text-white border border-gray-600' },
  { id: 'R', label: 'Red', class: 'bg-red-600 text-white' },
  { id: 'G', label: 'Green', class: 'bg-green-600 text-white' },
  { id: 'C', label: 'Colorless', class: 'bg-gray-500 text-white' },
]

const RARITIES = ['common', 'uncommon', 'rare', 'mythic']
const TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land']

export default function CardSearch({ onResults, onLoading }) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    colors: [],
    type: '',
    rarity: '',
    cmc: '',
    set: '',
  })
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const debouncedQuery = useDebounce(query, 300)

  // Autocomplete
  useEffect(() => {
    if (debouncedQuery.length >= 2 && !debouncedQuery.includes(':')) {
      autocomplete(debouncedQuery).then(d => {
        setSuggestions(d.data?.slice(0, 6) || [])
        setShowSuggestions(true)
      }).catch(() => setSuggestions([]))
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [debouncedQuery])

  const buildQuery = (q = query) => {
    let parts = [q.trim()]
    if (filters.colors.length > 0) {
      parts.push(`c:${filters.colors.join('')}`)
    }
    if (filters.type) {
      parts.push(`t:${filters.type.toLowerCase()}`)
    }
    if (filters.rarity) {
      parts.push(`r:${filters.rarity}`)
    }
    if (filters.cmc) {
      parts.push(`cmc:${filters.cmc}`)
    }
    if (filters.set) {
      parts.push(`s:${filters.set.toLowerCase()}`)
    }
    return parts.filter(Boolean).join(' ')
  }

  const doSearch = async (q = null) => {
    const finalQuery = q || buildQuery()
    if (!finalQuery.trim()) return
    setShowSuggestions(false)
    onLoading?.(true)
    try {
      const result = await searchCards(finalQuery)
      onResults?.(result, finalQuery)
    } catch (e) {
      onResults?.({ data: [], total_cards: 0, has_more: false }, finalQuery)
    } finally {
      onLoading?.(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      doSearch()
    }
  }

  const toggleColor = (colorId) => {
    setFilters(f => ({
      ...f,
      colors: f.colors.includes(colorId)
        ? f.colors.filter(c => c !== colorId)
        : [...f.colors, colorId]
    }))
  }

  const clearAll = () => {
    setQuery('')
    setFilters({ colors: [], type: '', rarity: '', cmc: '', set: '' })
    setSuggestions([])
  }

  const activeFilterCount = filters.colors.length +
    (filters.type ? 1 : 0) +
    (filters.rarity ? 1 : 0) +
    (filters.cmc ? 1 : 0) +
    (filters.set ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-app-surface2 border border-app-border rounded-xl px-3 py-2.5">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cards... (Scryfall syntax supported)"
            className="bg-transparent flex-1 text-gray-100 placeholder-gray-500 outline-none text-sm"
          />
          {query && (
            <button onClick={clearAll} className="text-gray-500 hover:text-gray-300">
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'text-app-accent2 bg-purple-900/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Filter size={14} />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-app-accent text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-app-surface border border-app-border rounded-xl shadow-xl z-20 overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s)
                  setShowSuggestions(false)
                  doSearch(s)
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-app-surface2 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-app-surface2 border border-app-border rounded-xl p-4 space-y-4">
          {/* Colors */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Colors</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleColor(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${c.class}
                    ${filters.colors.includes(c.id) ? 'ring-2 ring-white scale-105' : 'opacity-60 hover:opacity-100'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Card Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setFilters(f => ({ ...f, type: f.type === t ? '' : t }))}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    filters.type === t
                      ? 'bg-app-accent text-white'
                      : 'bg-app-surface border border-app-border text-gray-300 hover:border-app-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Rarity</p>
            <div className="flex flex-wrap gap-2">
              {RARITIES.map(r => (
                <button
                  key={r}
                  onClick={() => setFilters(f => ({ ...f, rarity: f.rarity === r ? '' : r }))}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                    filters.rarity === r
                      ? 'bg-app-accent text-white'
                      : 'bg-app-surface border border-app-border text-gray-300 hover:border-app-accent'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* CMC and Set in a row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">CMC</label>
              <input
                type="text"
                value={filters.cmc}
                onChange={e => setFilters(f => ({ ...f, cmc: e.target.value }))}
                placeholder="e.g. 3 or <=4"
                className="input-field text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">Set Code</label>
              <input
                type="text"
                value={filters.set}
                onChange={e => setFilters(f => ({ ...f, set: e.target.value }))}
                placeholder="e.g. MH3"
                className="input-field text-sm uppercase"
              />
            </div>
          </div>

          <button
            onClick={() => doSearch()}
            className="btn-primary w-full"
          >
            Search
          </button>
        </div>
      )}

      {/* Search button when no filters shown */}
      {!showFilters && (
        <button
          onClick={() => doSearch()}
          className="btn-primary w-full"
          disabled={!buildQuery().trim()}
        >
          Search
        </button>
      )}
    </div>
  )
}
