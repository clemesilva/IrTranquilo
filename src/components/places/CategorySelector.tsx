import { useRef, useState } from 'react'
import type { PlaceCategory } from '@/types/place'
import { CATEGORIES, getCategoryMeta } from '@/types/place'
import { cn } from '@/lib/utils'

interface CategorySelectorProps {
  value: PlaceCategory | null
  onChange: (value: PlaceCategory) => void
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const longPressTimer = useRef<number | null>(null)

  function handleLongPressStart(categoryValue: PlaceCategory) {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      setTooltip(categoryValue)
    }, 500)
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setTooltip(null)
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {CATEGORIES.map((cat) => {
        const meta = getCategoryMeta(cat.value)
        const isSelected = value === meta.value
        return (
          <button
            key={meta.value}
            type="button"
            onClick={() => onChange(meta.value)}
            onMouseEnter={() => setTooltip(meta.value)}
            onMouseLeave={() => setTooltip(null)}
            onTouchStart={() => handleLongPressStart(meta.value)}
            onTouchEnd={handleLongPressEnd}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-lg border px-1.5 py-1.5 text-center transition-colors sm:rounded-xl sm:px-2 sm:py-2',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-neutral-200 bg-white hover:bg-neutral-50',
            )}
          >
            <div className="text-lg leading-none sm:text-xl" aria-hidden>
              {meta.icon}
            </div>
            <div className="mt-0.5 text-[10px] font-medium leading-tight text-neutral-800 sm:text-[11px]">
              {meta.label}
            </div>

            {tooltip === meta.value ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg">
                {meta.tooltip}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

