import { useState, useCallback } from 'react'
import { Plus, Sparkles, BookmarkPlus, CheckCircle } from 'lucide-react'
import CardSearch from '../components/CardSearch'
import CardImage from '../components/CardImage'
import CollectionEntryModal from '../components/CollectionEntry'
import { LocationBadge, ColorIdentity, RarityBadge } from '../components/LocationBadge'

function CardCard({ card, onAdd }) {
  return (
    <div
      className="surface-card overflow-hidden cursor-pointer hover:border-app-accent transition-colors"
      onClick={() => onAdd(card)}
    >
      <div className="relative">
        <CardImage
          card={card}
          size="normal"
          className="w-full aspect-[5/7] object-cover"
        />
        {card.in_collection && (
          <div className="absolute top-1 right-1 bg-green-600 rounded-full p-0.5">
            <CheckCircle size={12} className="text-white" />
          </div>
        )}
        {card.foil && (
          <div className="absolute top-1 left-1 bg-yellow-500/80 rounded px-1 py-0.5 text-[9px] font-bold text-black">
            FOIL
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-gray-100 truncate leading-tight">{card.name}</p>
        <div className="flex items-center justify-between">
          <ColorIdentity colors={card.color_identity} />
          <RarityBadge rarity={card.rarity} />
        </div>
        {(card.price_usd || card.price_eur) && (
          <p className="text-[10px] text-green-400">
            {card.price_usd && `$${card.price_usd}`}
            {card.price_usd && card.price_eur && ' · '}
            {card.price_eur && `€${card.price_eur}`}
          </p>
        )}
        {card.in_collection && (
          <p className="text-[10px] text-blue-400">In collection ({card.collection_qty})</p>
        )}
      </div>
    </div>
  )
}

function CardDetail({ card, onAdd, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-app-surface w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-app-border max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 space-y-4">
          <div className="flex gap-4">
            <CardImage card={card} size="normal" className="w-36 flex-shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <p className="font-bold text-gray-100">{card.name}</p>
              <p className="text-sm text-gray-400">{card.set_name}</p>
              {card.mana_cost && (
                <p className="text-xs text-gray-400 font-mono">{card.mana_cost}</p>
              )}
              <p className="text-sm text-gray-300">{card.type_line}</p>
              {card.rarity && (
                <span className="text-xs capitalize text-yellow-400">{card.rarity}</span>
              )}
              <div className="space-y-0.5">
                {card.price_usd && <p className="text-xs text-green-400">USD: ${card.price_usd}</p>}
                {card.price_eur && <p className="text-xs text-green-400">EUR: €{card.price_eur}</p>}
                {card.price_usd_foil && <p className="text-xs text-yellow-400">Foil: ${card.price_usd_foil}</p>}
              </div>
            </div>
          </div>

          {card.oracle_text && (
            <div className="bg-app-surface2 rounded-xl p-3">
              <p className="text-sm text-gray-300 italic whitespace-pre-line">{card.oracle_text}</p>
            </div>
          )}

          {card.power && card.toughness && (
            <p className="text-sm text-gray-300 text-right">{card.power}/{card.toughness}</p>
          )}

          {card.in_collection && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <CheckCircle size={16} />
              <span>In your collection ({card.collection_qty} copies)</span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button
              onClick={() => onAdd(card)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <BookmarkPlus size={16} />
              Add to Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [addCard, setAddCard] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleResults = useCallback((data, q) => {
    setResults(data.data || [])
    setTotal(data.total_cards || 0)
    setQuery(q)
    setHasSearched(true)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-app-surface border-b border-app-border safe-top">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-app-accent2" />
            <h1 className="text-lg font-bold">Card Search</h1>
          </div>
          <CardSearch onResults={handleResults} onLoading={setLoading} />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
          </div>
        )}

        {!loading && hasSearched && (
          <>
            <p className="text-sm text-gray-400 mb-3">
              {total > 0 ? `${total.toLocaleString()} cards found` : 'No cards found'}
            </p>
            <div className="card-grid">
              {results.map(card => (
                <CardCard
                  key={`${card.id}`}
                  card={card}
                  onAdd={setAddCard}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !hasSearched && (
          <div className="text-center py-16 text-gray-500">
            <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Search for cards</p>
            <p className="text-sm mt-1">Use Scryfall syntax or filters above</p>
            <div className="mt-4 text-xs space-y-1">
              <p className="text-gray-600">Examples: "Lightning Bolt", "t:creature r:rare", "c:UR cmc&lt;=3"</p>
            </div>
          </div>
        )}
      </div>

      {/* Add to collection modal */}
      {addCard && (
        <CollectionEntryModal
          card={addCard}
          onClose={() => setAddCard(null)}
          onSaved={() => setAddCard(null)}
        />
      )}
    </div>
  )
}
