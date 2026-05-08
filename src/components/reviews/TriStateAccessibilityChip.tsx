/** Cada campo muestra dos botones: ✓ (sí) y ✗ (no). Tocar el activo lo deselecciona. */
export function TriStateAccessibilityChip({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean | null
  onChange: (next: boolean | null) => void
}) {
  return (
    <div
      title={description}
      className='flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 shadow-sm w-full sm:px-3 sm:py-2'
    >
      <span className='min-w-0 flex-1 text-[11px] font-medium text-neutral-700 leading-snug sm:text-[13px]'>
        {label}
      </span>
      <div className='flex shrink-0 gap-0.5 sm:gap-1'>
        <button
          type='button'
          aria-label={`${label}: sí`}
          onClick={() => onChange(value === true ? null : true)}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-all sm:h-7 sm:w-7 ${
            value === true
              ? 'bg-emerald-500 text-white'
              : 'bg-neutral-100 text-neutral-400 hover:bg-emerald-100 hover:text-emerald-600'
          }`}
        >
          ✓
        </button>
        <button
          type='button'
          aria-label={`${label}: no`}
          onClick={() => onChange(value === false ? null : false)}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-all sm:h-7 sm:w-7 ${
            value === false
              ? 'bg-rose-500 text-white'
              : 'bg-neutral-100 text-neutral-400 hover:bg-rose-100 hover:text-rose-600'
          }`}
        >
          ✗
        </button>
      </div>
    </div>
  )
}
