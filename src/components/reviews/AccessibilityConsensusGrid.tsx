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
  parking_accessible: '♿',
  signage_clear: '🪧',
  ramp_available: '🛝',
  mechanical_stairs: '🪜',
  elevator_available: '🛗',
  wide_entrance: '📏',
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
  const isUser = consensus.source === 'user';
  const value = isUser ? consensus.value : consensus.value;

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

  const bg =
    isUser && value
      ? 'border-emerald-300/90 bg-emerald-50 text-emerald-950 ring-1 ring-inset ring-emerald-200/70'
      : isUser && !value
        ? 'border-rose-300/90 bg-rose-50 text-rose-950 ring-1 ring-inset ring-rose-200/70'
        : value
          ? 'border-emerald-200/80 bg-emerald-50/30'
          : 'border-rose-200/80 bg-rose-50/30';

  const subtitle = (() => {
    if (consensus.source === 'google') {
      return value ? '♿ Según Google: accesible' : '♿ Según Google: no accesible';
    }
    return value
      ? `${consensus.yes}/${consensus.total} confirman que es accesible`
      : `${consensus.no}/${consensus.total} dicen que NO es accesible`;
  })();

  return (
    <div
      className={cn(
        'max-w-full min-w-0 rounded-2xl border px-3 py-2',
        bg,
      )}
    >
      <div className='flex min-w-0 items-start justify-between gap-2'>
        <span className='flex min-w-0 items-center gap-2 text-sm font-semibold leading-snug text-neutral-900'>
          <span className='shrink-0' aria-hidden>
            {ACCESSIBILITY_FIELD_EMOJI[fieldKey]}
          </span>
          <span className='min-w-0 truncate'>{label}</span>
        </span>
      </div>
      <span
        className={cn(
          'mt-0.5 text-[11px] font-medium tabular-nums leading-snug sm:text-xs',
          value ? 'text-emerald-800' : 'text-rose-800',
        )}
      >
        {subtitle}
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
        if (onlyMajorityYes && c.value !== true) return acc;
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
              return c.source === 'google' ? c.value === true : c.value === true;
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
                          isCompact && f.key === 'wide_entrance'
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
                            isCompact && f.key === 'wide_entrance'
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
