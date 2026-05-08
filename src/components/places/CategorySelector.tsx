import { useRef, useState } from 'react'
import type { PlaceCategory } from '@/types/place'
import { CATEGORIES, getCategoryMeta } from '@/types/place'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/icons/appIcons'
import { COLORS } from '@/styles/colors'

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
    <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 sm:gap-1.5">
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
              'relative flex flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center transition-colors sm:px-1.5 sm:py-1.5',
              isSelected ? 'border-primary' : 'border-neutral-200 bg-white hover:bg-neutral-50',
            )}
            style={isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : undefined}
          >
            <CategoryIcon category={meta.value} size={16} style={{ color: isSelected ? '#fff' : undefined }} className={`${isSelected ? '' : 'text-neutral-700'} sm:w-5! sm:h-5!`} aria-hidden />
            <div className="mt-0.5 text-[9px] font-medium leading-tight sm:text-[11px]" style={{ color: isSelected ? '#fff' : undefined }}>
              {meta.label}
            </div>

            {tooltip === meta.value ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[160px] -translate-x-1/2 rounded-lg bg-black/80 px-2.5 py-1.5 text-center text-[10px] font-medium leading-snug text-white shadow-lg">
                {meta.tooltip}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

