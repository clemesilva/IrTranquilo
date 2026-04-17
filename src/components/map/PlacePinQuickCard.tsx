import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bandLabelEs } from '@/lib/rating'
import type { PlaceWithStats } from '@/context/placesContext'
import { getCategoryMeta } from '@/types/place'

function bandClasses(band: PlaceWithStats['band']) {
  switch (band) {
    case 'recommended':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200/80'
    case 'acceptable':
      return 'bg-amber-50 text-amber-900 ring-amber-200/80'
    case 'not_recommended':
      return 'bg-rose-50 text-rose-900 ring-rose-200/80'
  }
}

export function PlacePinQuickCard({
  place,
  onClose,
  onViewDetail,
}: {
  place: PlaceWithStats
  onClose: () => void
  onViewDetail: () => void
}) {
  return (
    <div className="w-[min(92vw,420px)] rounded-2xl border border-neutral-200/80 bg-white/95 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-neutral-900">
              {place.name}
            </h3>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                bandClasses(place.band),
              )}
            >
              {bandLabelEs(place.band)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
            <span>{getCategoryMeta(place.category).label}</span>
            <span className="text-neutral-400">·</span>
            <span className="font-medium">
              {place.avgRating.toFixed(1)} <span aria-hidden>⭐</span>
            </span>
          </div>
          {place.band === 'recommended' ? (
            <div className="mt-2 text-lg" aria-hidden>
              ♿
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <Button type="button" className="h-9 w-full text-sm" onClick={onViewDetail}>
          Ver detalle completo
        </Button>
      </div>
    </div>
  )
}

