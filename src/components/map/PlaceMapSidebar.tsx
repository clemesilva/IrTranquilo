import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlaces } from '@/context/usePlaces';
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { PlaceReviewFormDialog } from '@/components/reviews/PlaceReviewFormDialog';
import type { PlaceWithStats } from '@/context/placesContext';
import { categoryGlyph } from '@/lib/pins';
import { formatRelativeTimeEs } from '@/lib/relativeTime';
import type { AccessibilityConsensusMap } from '@/lib/reviewAccessibilityConsensus';
import { PLACE_CATEGORY_LABEL_ES, type PlaceReview } from '@/types/place';
import { COLORS } from '@/styles/colors';
import { cn } from '@/lib/utils';

type PanelTab = 'overview' | 'reviews';

function StarRow({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const full = Math.round(rating);
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'text-sm leading-none sm:text-base',
            i < full ? 'text-amber-400' : 'text-neutral-200',
          )}
        >
          {'\u2605'}
        </span>
      ))}
    </div>
  );
}

// InfoRow eliminado (dirección ahora va en línea junto a "Cómo llegar")

interface PlaceMapSidebarProps {
  place: PlaceWithStats;
  onClose: () => void;
}

export function PlaceMapSidebar({ place, onClose }: PlaceMapSidebarProps) {
  const navigate = useNavigate();
  const { reviewsForPlace, accessibilityConsensusForPlace } = usePlaces();
  const [tab, setTab] = useState<PanelTab>('overview');
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [consensus, setConsensus] = useState<AccessibilityConsensusMap | null>(
    null,
  );
  const [consensusLoading, setConsensusLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      // Evita setState síncrono en el cuerpo del effect (regla de lint del proyecto)
      queueMicrotask(() => {
        if (!cancelled) setReviewsLoading(true);
      });
      reviewsForPlace(place.id).then((rows) => {
        if (cancelled) return;
        setReviews(rows);
        setReviewsLoading(false);
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [place.id, reviewsForPlace]);

  const reloadSidebarLists = async () => {
    setReviewsLoading(true);
    setConsensusLoading(true);
    const [rows, c] = await Promise.all([
      reviewsForPlace(place.id),
      accessibilityConsensusForPlace(place.id),
    ]);
    setReviews(rows);
    setConsensus(c);
    setReviewsLoading(false);
    setConsensusLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    // Evita setState síncrono en el cuerpo del effect (regla de lint del proyecto)
    queueMicrotask(() => {
      if (!cancelled) setConsensusLoading(true);
    });
    void accessibilityConsensusForPlace(place.id).then((c) => {
      if (cancelled) return;
      setConsensus(c);
      setConsensusLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id, accessibilityConsensusForPlace]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  // Compartir eliminado del sidebar (solo queda en detalle completo)

  const hasStrongRatingSignal =
    place.band === 'recommended' ||
    (place.reviewCount > 0 && place.avgRating >= 4);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden bg-white/95 shadow-[0_0_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md animate-in slide-in-from-right-4 duration-200',
        'h-full w-[min(84vw,22rem)] rounded-l-2xl border-y border-l border-neutral-200/90 sm:w-[min(86vw,24rem)]',
        'sm:w-104 sm:rounded-l-2xl sm:rounded-r-none sm:border-y sm:border-l sm:border-r-0',
      )}
      style={{ borderLeftColor: COLORS.border }}
      role='dialog'
      aria-labelledby='place-map-sidebar-title'
    >
      {/* Cabecera compacta: encaja con el mapa, sin bloque azul alto */}
      <header className='shrink-0 border-b border-neutral-200/80 bg-linear-to-b from-white to-slate-50/80 px-3 pb-1.5 pt-2 sm:px-3.5 sm:pb-2 sm:pt-2.5'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 flex-1 gap-2.5'>
            <span
              className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg shadow-sm ring-1 ring-primary/15 sm:h-10 sm:w-10 sm:text-xl'
              aria-hidden
            >
              {categoryGlyph(place.category)}
            </span>
            <div className='min-w-0 pt-0.5'>
              <h2
                id='place-map-sidebar-title'
                className='text-sm font-semibold leading-snug tracking-tight text-neutral-900 sm:text-[1.05rem]'
              >
                {place.name}
              </h2>
              <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-600 sm:mt-1 sm:text-xs'>
                <span>{PLACE_CATEGORY_LABEL_ES[place.category]}</span>
                {hasStrongRatingSignal ? (
                  <span className='inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary'>
                    <span aria-hidden>{'\u267F'}</span>
                    Bien valorado
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900'
            onClick={onClose}
            aria-label='Cerrar'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>

        <div className='mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className='text-lg font-semibold tabular-nums text-neutral-900 sm:text-xl'>
            {place.avgRating.toFixed(1).replace('.', ',')}
          </span>
          <StarRow rating={place.avgRating} />
          <span className='text-xs text-neutral-500'>
            ({place.reviewCount}{' '}
            {place.reviewCount === 1 ? 'reseña' : 'reseñas'})
          </span>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col px-3 pb-2 pt-1 sm:px-3.5 sm:pb-2.5 sm:pt-1.5'>
        <div className='flex shrink-0 gap-0.5 border-b border-neutral-200/80'>
          {(
            [
              ['overview', 'Vista general'],
              ['reviews', 'Reseñas'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className={cn(
                '-mb-px flex-1 border-b-2 px-1 py-1.5 text-center text-xs font-medium transition-colors sm:text-[13px]',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* En Reseñas no mostramos la dirección */}
        {tab === 'overview' ? (
          <div className='mt-2 flex shrink-0 items-center gap-2.5 px-0.5 sm:mt-2.5 sm:gap-3'>
            <a
              href={directionsUrl}
              target='_blank'
              rel='noreferrer'
              className='shrink-0'
              aria-label='Cómo llegar'
              title='Cómo llegar'
            >
              <span
                className='flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-95 sm:h-7 sm:w-7'
                style={{ backgroundColor: COLORS.primaryDark }}
              >
                <Navigation className='h-3.5 w-3.5 sm:h-4 sm:w-4' strokeWidth={2} />
              </span>
            </a>

            <div className='flex min-w-0 items-start gap-2 rounded-lg bg-slate-50/90 px-3 py-2 ring-1 ring-inset ring-neutral-200/60'>
              <MapPin
                className='mt-0.5 h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4'
                strokeWidth={2}
                aria-hidden
              />
              <p className='min-w-0 text-xs font-medium leading-snug text-neutral-900 sm:text-sm'>
                {place.address}
              </p>
            </div>
          </div>
        ) : null}

        {tab === 'overview' ? (
          <Separator className='my-2 shrink-0 bg-neutral-200/80 sm:my-2.5' />
        ) : (
          <div className='h-2.5 shrink-0' />
        )}

        <ScrollArea className='min-h-0 flex-1 pr-2'>
          <div className='pb-2'>
            {tab === 'overview' && (
              <div className='space-y-3'>
                <AccessibilityConsensusGrid
                  consensus={consensus}
                  loading={consensusLoading}
                  heading='Accesibilidad inclusiva'
                  headingClassName='text-xs font-bold uppercase tracking-widest text-neutral-700 sm:text-sm'
                  variant='compact'
                  onlyMajorityYes
                />
              </div>
            )}

            {tab === 'reviews' && (
              <div className='space-y-2.5'>
                <div className='flex justify-center'>
                  <PlaceReviewFormDialog
                    placeId={place.id}
                    onSaved={() => void reloadSidebarLists()}
                    triggerLabel='Escribir una reseña'
                    triggerVariant='outline'
                    triggerClassName='h-9 w-fit rounded-full border-primary/30 bg-white px-4 text-primary shadow-sm hover:bg-primary/5'
                  />
                </div>
                {reviewsLoading ? (
                  <p className='text-sm text-neutral-500'>Cargando reseñas…</p>
                ) : reviews.length === 0 ? (
                  <p className='text-sm leading-relaxed text-neutral-600'>
                    No hay reseñas todavía. Sé la primera persona en dejar una.
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div
                      key={r.id}
                      className='rounded-lg border border-neutral-200/80 bg-slate-50/60 p-3'
                    >
                      <div className='mb-1 flex items-start justify-between gap-3'>
                        <p className='text-sm font-semibold leading-snug text-neutral-900'>
                          {r.authorName ?? 'Usuario'}
                        </p>
                        {formatRelativeTimeEs(r.createdAt ?? null) ? (
                          <p className='shrink-0 text-xs text-neutral-500'>
                            {formatRelativeTimeEs(r.createdAt ?? null)}
                          </p>
                        ) : null}
                      </div>

                      <div className='mb-1 flex items-center gap-2'>
                        <StarRow rating={r.rating} className='scale-90' />
                        <span className='text-xs font-medium tabular-nums text-neutral-700'>
                          {r.rating}/5
                        </span>
                      </div>
                      {r.comment ? (
                        <p className='text-sm leading-relaxed text-neutral-700'>
                          {r.comment}
                        </p>
                      ) : (
                        <p className='text-xs italic text-neutral-400'>
                          Sin comentario
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          className='mt-2 shrink-0 border-t border-neutral-200/80 pt-2.5'
          style={{ borderColor: COLORS.border }}
        >
          <div className='mt-3 shrink-0'>
            <Button
              type='button'
              className='h-8 w-full text-xs sm:h-9 sm:text-sm'
              onClick={() => navigate(`/lugares/${place.id}`)}
            >
              Ver detalle completo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
