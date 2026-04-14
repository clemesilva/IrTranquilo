import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Fila de checklist: verde si cumple, rojizo si consta ausencia o no cumple. */
export function AccessibilityAspectRow({
  ok,
  children,
}: {
  ok: boolean
  children: ReactNode
}) {
  return (
    <li
      className={cn(
        'flex gap-2 rounded-md border px-2 py-1.5 text-sm leading-snug',
        ok
          ? 'border-emerald-200/90 bg-emerald-50/95 text-emerald-950'
          : 'border-rose-200/90 bg-rose-50/95 text-rose-950',
      )}
    >
      <span className='shrink-0 font-bold' aria-hidden>
        {ok ? '\u2713' : '\u2717'}
      </span>
      <span>{children}</span>
    </li>
  )
}
