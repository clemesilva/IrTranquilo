import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Share2, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlaces } from '@/context/usePlaces';
import { useAuth } from '@/context/useAuth';
import type { PlaceWithStats } from '@/context/placesContext';
import { categoryGlyph } from '@/lib/pins';
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

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className='flex gap-3 rounded-lg bg-slate-50/90 px-3 py-2.5 ring-1 ring-inset ring-neutral-200/60'>
      <Icon className='mt-0.5 h-4 w-4 shrink-0 text-primary' strokeWidth={2} />
      <div className='min-w-0 flex-1 text-sm leading-snug text-neutral-800'>
        {children}
      </div>
    </div>
  );
}

interface PlaceMapSidebarProps {
  place: PlaceWithStats;
  onClose: () => void;
}

export function PlaceMapSidebar({ place, onClose }: PlaceMapSidebarProps) {
  const navigate = useNavigate();
  const { reviewsForPlace, createReview } = usePlaces();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<PanelTab>('overview');
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setReviewsLoading(true);
    });
    reviewsForPlace(place.id).then((rows) => {
      if (cancelled) return;
      setReviews(rows);
      setReviewsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id, reviewsForPlace]);

  const canSubmitReview = useMemo(() => {
    return (
      isAuthenticated && newRating >= 1 && newRating <= 5 && !isSubmittingReview
    );
  }, [isAuthenticated, newRating, isSubmittingReview]);

  const handleSubmitReview = async () => {
    if (!isAuthenticated) return;
    if (newRating < 1 || newRating > 5) return;
    setIsSubmittingReview(true);
    setSubmitError(null);
    try {
      await createReview(place.id, newRating, newComment);
      const rows = await reviewsForPlace(place.id);
      setReviews(rows);
      setNewRating(0);
      setNewComment('');
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'No se pudo enviar la reseña.',
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
  const elevatorConfirmed = (place.interior.elevator ?? '')
    .toLowerCase()
    .includes('yes');

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: place.name,
          text: place.address,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* usuario canceló o no hay permiso */
    }
  };

  const hasAccessibilitySignal =
    place.features?.accessibleParking === true ||
    place.features?.accessibleEntrance === true ||
    place.features?.adaptedRestroom === true ||
    Boolean(place.entrance.accessNote?.trim());

  return (
    <div
      className='flex h-full min-h-0 max-w-full flex-col overflow-hidden rounded-l-2xl border-y border-l border-neutral-200/90 bg-white/95 shadow-[0_0_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md animate-in slide-in-from-right-4 duration-200 sm:max-w-[22rem]'
      style={{ borderLeftColor: COLORS.border }}
      role='dialog'
      aria-labelledby='place-map-sidebar-title'
    >
      {/* Cabecera compacta: encaja con el mapa, sin bloque azul alto */}
      <header className='shrink-0 border-b border-neutral-200/80 bg-gradient-to-b from-white to-slate-50/80 px-3.5 pb-3 pt-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 flex-1 gap-2.5'>
            <span
              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl shadow-sm ring-1 ring-primary/15'
              aria-hidden
            >
              {categoryGlyph(place.category)}
            </span>
            <div className='min-w-0 pt-0.5'>
              <h2
                id='place-map-sidebar-title'
                className='text-base font-semibold leading-snug tracking-tight text-neutral-900 sm:text-[1.05rem]'
              >
                {place.name}
              </h2>
              <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600'>
                <span>{PLACE_CATEGORY_LABEL_ES[place.category]}</span>
                {hasAccessibilitySignal ? (
                  <span className='inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary'>
                    <span aria-hidden>{'\u267F'}</span>
                    Accesible
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

        <div className='mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className='text-xl font-semibold tabular-nums text-neutral-900'>
            {place.avgRating.toFixed(1).replace('.', ',')}
          </span>
          <StarRow rating={place.avgRating} />
          <span className='text-xs text-neutral-500'>
            ({place.reviewCount}{' '}
            {place.reviewCount === 1 ? 'reseña' : 'reseñas'})
          </span>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col px-3.5 pb-3 pt-2'>
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
                '-mb-px flex-1 border-b-2 px-1 py-2 text-center text-xs font-medium transition-colors sm:text-[13px]',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Acciones rápidas (sin Explorar) */}
        <div className='mt-3 flex shrink-0 justify-between gap-2 px-0.5'>
          <a
            href={directionsUrl}
            target='_blank'
            rel='noreferrer'
            className='flex flex-1 flex-col items-center gap-1'
          >
            <span
              className='flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition hover:opacity-95'
              style={{ backgroundColor: COLORS.primaryDark }}
            >
              <Navigation className='h-5 w-5' strokeWidth={2} />
            </span>
            <span className='max-w-[4.5rem] text-center text-[10px] font-medium leading-tight text-neutral-600'>
              Cómo llegar
            </span>
          </a>

          <button
            type='button'
            className='flex flex-1 flex-col items-center gap-1'
            onClick={handleShare}
          >
            <span className='flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-primary shadow-sm ring-1 ring-neutral-100 transition hover:bg-slate-50'>
              <Share2 className='h-5 w-5' strokeWidth={2} />
            </span>
            <span className='max-w-[4.5rem] text-center text-[10px] font-medium leading-tight text-neutral-600'>
              Compartir
            </span>
          </button>
        </div>

        <Separator className='my-3 shrink-0 bg-neutral-200/80' />

        <ScrollArea className='min-h-0 flex-1 pr-2'>
          <div className='pb-2'>
            {tab === 'overview' && (
              <div className='space-y-2'>
                <InfoRow icon={MapPin}>
                  <p className='font-medium text-neutral-900'>
                    {place.address}
                  </p>
                </InfoRow>

                <div className='flex flex-wrap items-center gap-2 text-sm text-neutral-700'>
                  {place.entrance.ramp === true ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-inset ring-neutral-200/70'>
                      <span aria-hidden>♿</span> Rampa
                    </span>
                  ) : null}
                  {place.features.adaptedRestroom === true ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-inset ring-neutral-200/70'>
                      <span aria-hidden>🚻</span> Baño accesible
                    </span>
                  ) : null}
                  {place.features.accessibleParking === true ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-inset ring-neutral-200/70'>
                      <span aria-hidden>🅿️</span> Parking
                    </span>
                  ) : null}
                  {elevatorConfirmed ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-inset ring-neutral-200/70'>
                      <span aria-hidden>🛗</span> Ascensor
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className='space-y-2.5'>
                <div className='rounded-lg border border-neutral-200/80 bg-white p-3'>
                  <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
                    Deja tu reseña
                  </p>
                  {!isAuthenticated ? (
                    <div className='mt-2 flex flex-col gap-2'>
                      <p className='text-sm text-neutral-600'>
                        Inicia sesión para escribir una reseña.
                      </p>
                      <Button
                        type='button'
                        variant='default'
                        className='h-9'
                        onClick={() => signInWithGoogle()}
                      >
                        Iniciar sesión con Google
                      </Button>
                    </div>
                  ) : (
                    <div className='mt-2 space-y-2'>
                      <div className='flex items-center gap-1'>
                        {Array.from({ length: 5 }, (_, i) => {
                          const v = i + 1;
                          const active = newRating >= v;
                          return (
                            <button
                              key={v}
                              type='button'
                              className='p-1'
                              onClick={() => setNewRating(v)}
                              aria-label={`Calificar ${v} de 5`}
                            >
                              <span
                                className={cn(
                                  'text-lg leading-none',
                                  active
                                    ? 'text-amber-400'
                                    : 'text-neutral-200',
                                )}
                              >
                                {'\u2605'}
                              </span>
                            </button>
                          );
                        })}
                        <span className='ml-2 text-xs font-medium tabular-nums text-neutral-600'>
                          {newRating ? `${newRating}/5` : 'Elige estrellas'}
                        </span>
                      </div>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder='Escribe tu reseña (opcional)…'
                        className='w-full resize-none rounded-md border border-neutral-200/80 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10'
                        rows={3}
                      />
                      {submitError ? (
                        <p className='text-sm text-rose-600'>{submitError}</p>
                      ) : null}
                      <Button
                        type='button'
                        className='h-9 w-full text-sm'
                        onClick={handleSubmitReview}
                        disabled={!canSubmitReview}
                      >
                        {isSubmittingReview ? 'Enviando…' : 'Publicar reseña'}
                      </Button>
                    </div>
                  )}
                </div>

                {reviewsLoading ? (
                  <p className='text-sm text-neutral-500'>Cargando reseñas…</p>
                ) : reviews.length === 0 ? (
                  <p className='text-sm leading-relaxed text-neutral-600'>
                    No hay reseñas todavía. Evalúa este lugar desde{' '}
                    <button
                      type='button'
                      className='font-medium text-primary underline underline-offset-2'
                      onClick={() => navigate('/places/new')}
                    >
                      Añadir lugar
                    </button>
                    .
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div
                      key={r.id}
                      className='rounded-lg border border-neutral-200/80 bg-slate-50/60 p-3'
                    >
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
              className='h-9 w-full text-sm'
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
