import { useMemo, useState } from 'react';
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
  className,
}: {
  fieldKey: AccessibilityReviewKey;
  label: string;
  consensus: ConsensusForField;
  variant: 'full' | 'compact';
  className?: string;
}) {
  if (!consensus) return null;
  const { yes, no, total, ratio } = consensus;
  const majorityYes = ratio >= 0.5;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-2xl border-2 bg-white px-2 py-1.5 text-neutral-900 shadow-sm',
          'border-neutral-200/80',
          className,
        )}
      >
        <span className='shrink-0' aria-hidden>
          {ACCESSIBILITY_FIELD_EMOJI[fieldKey]}
        </span>
        <span className='min-w-0 truncate whitespace-nowrap text-[12px] font-semibold leading-tight text-neutral-900 sm:text-sm'>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'max-w-full min-w-0 rounded-2xl border bg-white px-3 py-2',
        majorityYes
          ? 'border-emerald-200/80 bg-emerald-50/40'
          : 'border-rose-200/80 bg-rose-50/40',
      )}
    >
      <div className='flex min-w-0 items-start justify-between gap-2'>
        <span className='flex min-w-0 items-center gap-2 text-sm font-semibold leading-snug text-neutral-900'>
          <span className='shrink-0' aria-hidden>
            {ACCESSIBILITY_FIELD_EMOJI[fieldKey]}
          </span>
          <span className='min-w-0 truncate'>{label}</span>
        </span>
        <span
          className={cn(
            'hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none sm:inline-flex',
            majorityYes
              ? 'border-emerald-200/80 bg-white/70 text-emerald-800'
              : 'border-rose-200/80 bg-white/70 text-rose-800',
          )}
        >
          {majorityYes ? 'Accesible' : 'No accesible'}
        </span>
      </div>
      <span
        className={cn(
          'mt-0.5 text-[11px] font-medium tabular-nums leading-snug sm:text-xs',
          majorityYes ? 'text-emerald-700' : 'text-rose-700',
        )}
      >
        {majorityYes
          ? `${yes}/${total} confirman que es accesible`
          : `${no}/${total} confirman que NO es accesible`}
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
  onlyMajorityYes = false,
  collapseOnMobile = false,
}: {
  consensus: AccessibilityConsensusMap | null;
  loading?: boolean;
  className?: string;
  heading?: string;
  headingClassName?: string;
  variant?: 'full' | 'compact';
  onlyMajorityYes?: boolean;
  collapseOnMobile?: boolean;
}) {
  const isCompact = variant === 'compact';
  const shouldCollapse = collapseOnMobile && !isCompact;
  const [expandedMobile, setExpandedMobile] = useState(false);

  const hasOverflowGroups = useMemo(() => {
    if (!consensus) return false;
    return ACCESSIBILITY_FIELD_GROUPS.some((group) => {
      const visibleCount = group.fields.reduce((acc, f) => {
        const c = consensus[f.key];
        if (!c) return acc;
        if (onlyMajorityYes && c.ratio < 0.5) return acc;
        return acc + 1;
      }, 0);
      return visibleCount > 0;
    });
  }, [consensus, onlyMajorityYes]);

  return (
    <section className={cn(isCompact ? 'space-y-2' : 'space-y-3', className)}>
      <h2 className={headingClassName}>{heading}</h2>
      {loading || !consensus ? (
        <p className='text-sm text-neutral-500'>Cargando consenso…</p>
      ) : (
        <div className={cn(isCompact ? 'space-y-2' : 'space-y-3')}>
          <div
            className={cn(
              shouldCollapse && !expandedMobile
                ? 'relative max-h-[420px] overflow-hidden sm:max-h-none'
                : '',
            )}
          >
          {ACCESSIBILITY_FIELD_GROUPS.map((group) => {
            const visibleFields = group.fields.filter((f) => {
              const c = consensus[f.key];
              if (!c) return false;
              if (!onlyMajorityYes) return true;
              return c.ratio >= 0.5;
            });

            if (visibleFields.length === 0) return null;

            return (
              <div key={group.title}>
                <p
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider text-neutral-500',
                    isCompact ? 'mb-1' : 'mb-1.5',
                  )}
                >
                  {group.title}
                </p>
                <div
                  className={cn(
                    isCompact
                      ? 'grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-1.5'
                      : 'grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4',
                  )}
                >
                  {visibleFields.map((f) => {
                    const c = consensus[f.key]!;
                    return (
                      <div
                        key={f.key}
                        className={cn(
                          isCompact ? 'justify-self-start' : '',
                          isCompact && f.key === 'entrance_width_ok'
                            ? 'col-span-2'
                            : '',
                        )}
                      >
                        <ConsensusCard
                          fieldKey={f.key}
                          label={f.label}
                          consensus={c}
                          variant={variant}
                          className={
                            isCompact && f.key === 'entrance_width_ok'
                              ? 'w-fit'
                              : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
            {shouldCollapse && !expandedMobile ? (
              <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-white/95 sm:hidden' />
            ) : null}
          </div>

          {shouldCollapse && hasOverflowGroups ? (
            <div className='sm:hidden'>
              <button
                type='button'
                className='w-full rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm'
                onClick={() => setExpandedMobile((v) => !v)}
              >
                {expandedMobile ? 'Ver menos accesibilidad' : 'Ver más accesibilidad'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
