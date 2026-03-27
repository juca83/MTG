import { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { getLocations, addToCollection, updateCollectionEntry } from '../api'
import toast from 'react-hot-toast'
import CardImage from './CardImage'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ru', label: 'Russian' },
  { code: 'zhs', label: 'Chinese (S)' },
  { code: 'zht', label: 'Chinese (T)' },
  { code: 'ph', label: 'Phyrexian' },
]

export default function CollectionEntryModal({ card, existingEntry, onClose, onSaved }) {
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({
    quantity: existingEntry?.quantity || 1,
    foil: existingEntry?.foil || false,
    language: existingEntry?.language || 'en',
    location_id: existingEntry?.location_id || null,
    is_proxy: existingEntry?.is_proxy || false,
    notes: existingEntry?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLocations().then(d => setLocations(d.data || []))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      let result
      if (existingEntry) {
        result = await updateCollectionEntry(existingEntry.id, form)
        toast.success('Entry updated')
      } else {
        result = await addToCollection({ scryfall_id: card.id, ...form })
        toast.success(`Added ${form.quantity}x ${card.name}`)
      }
      onSaved?.(result)
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const groupedLocations = locations.reduce((acc, loc) => {
    const group = loc.type.replace(/_/g, ' ')
    if (!acc[group]) acc[group] = []
    acc[group].push(loc)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border sticky top-0 bg-app-surface">
          <h2 className="font-semibold text-lg">
            {existingEntry ? 'Edit Entry' : 'Add to Collection'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-border transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Card preview */}
          <div className="flex gap-3 items-start">
            <CardImage card={card} size="small" className="w-16 h-22 object-cover flex-shrink-0" />
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="text-sm text-gray-400">{card.set_name}</p>
              {card.price_usd && (
                <p className="text-xs text-green-400 mt-1">${card.price_usd}</p>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                className="p-2 rounded-lg bg-app-surface2 border border-app-border hover:bg-app-border transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-xl font-bold w-8 text-center">{form.quantity}</span>
              <button
                onClick={() => setForm(f => ({ ...f, quantity: f.quantity + 1 }))}
                className="p-2 rounded-lg bg-app-surface2 border border-app-border hover:bg-app-border transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Language</label>
            <select
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              className="input-field"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Foil / Proxy */}
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.foil}
                onChange={e => setForm(f => ({ ...f, foil: e.target.checked }))}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm">Foil</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_proxy}
                onChange={e => setForm(f => ({ ...f, is_proxy: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm">Proxy</span>
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <select
              value={form.location_id || ''}
              onChange={e => setForm(f => ({ ...f, location_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="input-field"
            >
              <option value="">-- No location --</option>
              {Object.entries(groupedLocations).map(([group, locs]) => (
                <optgroup key={group} label={group.charAt(0).toUpperCase() + group.slice(1)}>
                  {locs.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              className="input-field"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : existingEntry ? 'Update' : 'Add to Collection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
