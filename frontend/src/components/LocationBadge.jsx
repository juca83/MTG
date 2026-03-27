import { MapPin, Layers, Wand2 } from 'lucide-react'

export function LocationBadge({ locationName }) {
  if (!locationName) return null
  return (
    <span className="badge-location">
      <MapPin size={10} />
      {locationName}
    </span>
  )
}

export function DeckBadge({ deckName }) {
  if (!deckName) return null
  return (
    <span className="badge-deck">
      <Layers size={10} />
      {deckName}
    </span>
  )
}

export function ProxyBadge() {
  return (
    <span className="badge-proxy">
      <Wand2 size={10} />
      Proxy
    </span>
  )
}

// Color identity badges
const COLOR_MAP = {
  W: { label: 'W', bg: 'bg-yellow-100', text: 'text-yellow-900' },
  U: { label: 'U', bg: 'bg-blue-500', text: 'text-white' },
  B: { label: 'B', bg: 'bg-gray-700', text: 'text-white' },
  R: { label: 'R', bg: 'bg-red-600', text: 'text-white' },
  G: { label: 'G', bg: 'bg-green-600', text: 'text-white' },
  C: { label: 'C', bg: 'bg-gray-500', text: 'text-white' },
}

export function ColorPip({ color }) {
  const c = COLOR_MAP[color] || COLOR_MAP['C']
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

export function ColorIdentity({ colors }) {
  if (!colors || colors.length === 0) {
    return <ColorPip color="C" />
  }
  return (
    <div className="flex gap-0.5">
      {colors.map(c => <ColorPip key={c} color={c} />)}
    </div>
  )
}

export function RarityBadge({ rarity }) {
  const colors = {
    common: 'text-gray-400',
    uncommon: 'text-gray-300',
    rare: 'text-yellow-400',
    mythic: 'text-orange-400',
  }
  return (
    <span className={`text-xs capitalize ${colors[rarity] || 'text-gray-400'}`}>
      {rarity?.[0]?.toUpperCase()}
    </span>
  )
}
