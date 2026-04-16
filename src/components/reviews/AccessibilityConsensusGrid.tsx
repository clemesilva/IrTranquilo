import type {
  AccessibilityConsensusMap,
  ConsensusForField,
} from '@/lib/reviewAccessibilityConsensus';
import { cn } from '@/lib/utils';
import {
  ACCESSIBILITY_FIELD_GROUPS,
  type AccessibilityReviewKey,
} from '@/types/reviewAccessibility';

const ACCESSIBILITY_FIELD_EMOJI: Record<AccessibilityReviewKey, string> = {
  parking_available: '🅿️',
  parking_accessible: '♿',
  parking_near_entrance: '🚪',
  signage_clear: '🪧',
  step_free_access: '🪜',
  ramp_available: '🛝',
  elevator_available: '🛗',
  entrance_width_ok: '📏',
  interior_spacious: '🧭',
  wheelchair_table_access: '🪑',
  accessible_bathroom: '🚻',
  circulation_clear: '↔️',
};

function ConsensusCard({
  fieldKey,
  label,
  consensus,
  variant,
}: {
  fieldKey: AccessibilityReviewKey;
  label: string;
  consensus: ConsensusForField;
  variant: 'full' | 'compact';
}) {
  if (!consensus) return null;
  const { yes, no, total, ratio } = consensus;
  const majorityYes = ratio >= 0.6;

  if (variant === 'compact') {
    return (
      <div
        className='inline-flex max-w-full min-w-0 items-center gap-2 rounded-2xl border-2 border-neutral-300/80 bg-white px-2.5 py-1.5 text-neutral-900 shadow-sm'
      >
        <span className='shrink-0' aria-hidden>
          {ACCESSIBILITY_FIELD_EMOJI[fieldKey]}
        </span>
        <span className='min-w-0 text-sm font-semibold leading-snug text-neutral-900'>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className='inline-flex max-w-full min-w-0 flex-col gap-0.5 rounded-2xl border border-neutral-200/80 bg-white px-3 py-2'>
      <span className="text-sm font-semibold leading-snug text-neutral-900">
        {label}
      </span>
      <span
        className={cn(
          'text-xs font-medium tabular-nums leading-snug',
          majorityYes ? 'text-emerald-700' : 'text-rose-700',
        )}
      >
        {majorityYes
          ? `${yes}/${total} confirman que sí`
          : `${no}/${total} dicen que no`}
      </span>
    </div>
  );
}

export function AccessibilityConsensusGrid({
  consensus,
  loading = false,
  className = '',
  heading = 'Accesibilidad (consenso de reseñas)',
  headingClassName = 'text-sm font-semibold uppercase tracking-wider text-neutral-500',
  variant = 'full',
}: {
  consensus: AccessibilityConsensusMap | null;
  loading?: boolean;
  className?: string;
  heading?: string;
  headingClassName?: string;
  variant?: 'full' | 'compact';
}) {
  const isCompact = variant === 'compact';
  return (
    <section className={cn(isCompact ? 'space-y-2' : 'space-y-3', className)}>
      <h2 className={headingClassName}>{heading}</h2>
      {loading || !consensus ? (
        <p className="text-sm text-neutral-500">Cargando consenso…</p>
      ) : (
        <div className={cn(isCompact ? 'space-y-2' : 'space-y-3')}>
          {ACCESSIBILITY_FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wider text-neutral-500',
                  isCompact ? 'mb-1' : 'mb-1.5',
                )}
              >
                {group.title}
              </p>
              <div className={cn('flex flex-wrap', isCompact ? 'gap-1.5' : 'gap-2')}>
                {group.fields.map((f) => {
                  const c = consensus[f.key];
                  if (!c) return null;
                  return (
                    <ConsensusCard
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      consensus={c}
                      variant={variant}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
