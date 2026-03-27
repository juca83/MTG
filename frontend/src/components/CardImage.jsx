import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export default function CardImage({ card, className = '', size = 'normal' }) {
  const [error, setError] = useState(false)
  const src = size === 'small' ? card?.image_uri_small : card?.image_uri_normal

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-app-surface2 border border-app-border rounded-lg ${className}`}>
        <div className="text-center p-2">
          <ImageOff size={24} className="text-gray-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500 truncate max-w-[120px]">{card?.name}</p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={card?.name}
      className={`rounded-lg ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  )
}
