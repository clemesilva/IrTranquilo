import { cn } from '@/lib/utils'

/** Tri-estado: NULL (gris) → TRUE (verde) → FALSE (rojo) → NULL. */
export function TriStateAccessibilityChip({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  /** Texto largo solo al pasar el mouse (tooltip nativo). */
  description?: string
  value: boolean | null
  onChange: (next: boolean | null) => void
}) {
  const cycle = () => {
    if (value === null) onChange(true)
    else if (value === true) onChange(false)
    else onChange(null)
  }

  const isYes = value === true
  const isNo = value === false

  return (
    <button
      type="button"
      onClick={cycle}
      title={description}
      className={cn(
        'inline-flex min-h-8 w-fit max-w-full items-center justify-start gap-1.5 rounded-full border px-2 py-1 text-left text-[12px] font-medium transition-colors sm:w-full sm:justify-center sm:text-[13px]',
        description ? 'cursor-help' : null,
        isYes
          ? 'border-emerald-400 bg-emerald-50 text-emerald-950 ring-1 ring-inset ring-emerald-200/80'
          : isNo
            ? 'border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-inset ring-rose-200/80'
            : 'border-2 border-neutral-300 bg-white text-neutral-900 shadow-sm',
      )}
    >
      <span className="shrink-0 font-bold tabular-nums" aria-hidden>
        {isYes ? '\u2713' : isNo ? '\u2717' : '\u2022'}
      </span>
      <span className="min-w-0 truncate whitespace-nowrap leading-snug">
        {label}
      </span>
    </button>
  )
}
