import { cn } from '@/lib/utils'

/** Sí / no: tap alterna entre confirmado (verde) y no (rojo). */
export function TriStateAccessibilityChip({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  const cycle = () => {
    onChange(!value)
  }

  const isYes = value === true

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        'inline-flex min-h-8 w-fit max-w-full items-center justify-start gap-1.5 rounded-full border px-2 py-1 text-left text-[12px] font-medium transition-colors sm:w-full sm:justify-center sm:text-[13px]',
        isYes &&
          'border-emerald-300/90 bg-emerald-50 text-emerald-950 ring-1 ring-inset ring-emerald-200/70',
        !isYes &&
          'border-rose-300/90 bg-rose-50 text-rose-950 ring-1 ring-inset ring-rose-200/70',
      )}
    >
      <span className="shrink-0 font-bold tabular-nums" aria-hidden>
        {isYes ? '\u2713' : '\u2717'}
      </span>
      <span className="min-w-0 truncate whitespace-nowrap leading-snug">
        {label}
      </span>
    </button>
  )
}
