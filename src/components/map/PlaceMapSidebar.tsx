import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  MapPin,
  Navigation,
  Share2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePlaces } from '@/context/usePlaces';
import type { PlaceWithStats } from '@/context/placesContext';
import { bandLabelEs } from '@/lib/rating';
import { categoryGlyph } from '@/lib/pins';
import {
  PLACE_CATEGORY_LABEL_ES,
  type PlaceReview,
} from '@/types/place';
import { COLORS } from '@/styles/colors';
import { cn } from '@/lib/utils';
import { AccessibilityAspectRow } from '@/components/map/AccessibilityAspectRow';

type PanelTab = 'overview' | 'reviews' | 'info';

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
  const { reviewsForPlace } = usePlaces();
  const [tab, setTab] = useState<PanelTab>('overview');
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;

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
    place.features?.accessibleParking ||
    place.features?.accessibleEntrance ||
    place.features?.adaptedRestroom ||
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
              ['info', 'Información'],
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
          <a
            href={mapsUrl}
            target='_blank'
            rel='noreferrer'
            className='flex flex-1 flex-col items-center gap-1'
          >
            <span className='flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-primary shadow-sm ring-1 ring-neutral-100 transition hover:bg-slate-50'>
              <MapPin className='h-5 w-5' strokeWidth={2} />
            </span>
            <span className='max-w-[4.5rem] text-center text-[10px] font-medium leading-tight text-neutral-600'>
              Ver en mapa
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

                <InfoRow icon={Award}>
                  <p>
                    <span className='font-semibold text-neutral-900'>
                      {bandLabelEs(place.band)}
                    </span>
                    <span className='text-neutral-600'>
                      {' '}
                      · según reseñas de la comunidad
                    </span>
                  </p>
                </InfoRow>

                {place.features ? (
                  <div className='rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5'>
                    <p className='text-[10px] font-semibold uppercase tracking-wider text-neutral-500'>
                      Accesibilidad en el registro
                    </p>
                    <p className='mb-2 mt-1 text-[11px] leading-snug text-neutral-500'>
                      Se muestran tanto lo favorable (
                      <span className='text-emerald-800'>{'\u2713'}</span>) como lo
                      desfavorable o ausente (
                      <span className='text-rose-800'>{'\u2717'}</span>). En
                      observaciones se pueden detallar barandas, barra de
                      apoyo, ancho de paso, etc.
                    </p>
                    <ul className='space-y-1.5'>
                      <AccessibilityAspectRow
                        ok={place.features.accessibleParking}
                      >
                        {place.features.accessibleParking
                          ? 'Estacionamiento accesible'
                          : 'Sin estacionamiento accesible registrado'}
                      </AccessibilityAspectRow>
                      <AccessibilityAspectRow
                        ok={place.features.accessibleEntrance}
                      >
                        {place.features.accessibleEntrance
                          ? 'Entrada accesible'
                          : 'Entrada no marcada como accesible'}
                      </AccessibilityAspectRow>
                      <AccessibilityAspectRow
                        ok={place.features.adaptedRestroom}
                      >
                        {place.features.adaptedRestroom
                          ? 'Baño adaptado'
                          : 'Sin baño adaptado registrado'}
                      </AccessibilityAspectRow>
                      <AccessibilityAspectRow ok={place.entrance.noSteps}>
                        {place.entrance.noSteps
                          ? 'Entrada sin escalones (según registro)'
                          : 'Hay escalones o desnivel en la entrada'}
                      </AccessibilityAspectRow>
                      <AccessibilityAspectRow ok={place.entrance.ramp}>
                        {place.entrance.ramp
                          ? 'Rampa en la entrada'
                          : 'Sin rampa en la entrada'}
                      </AccessibilityAspectRow>
                    </ul>
                  </div>
                ) : null}

                {place.entrance.accessNote?.trim() ? (
                  <div className='rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5'>
                    <p className='text-[10px] font-semibold uppercase tracking-wider text-amber-900/90'>
                      Observaciones de la comunidad
                    </p>
                    <p className='mt-1 text-sm leading-relaxed text-amber-950'>
                      {place.entrance.accessNote.trim()}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {tab === 'reviews' && (
              <div className='space-y-2.5'>
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

            {tab === 'info' && (
              <div className='space-y-3 text-sm text-neutral-800'>
                <section className='rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5'>
                  <h3 className='mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500'>
                    Llegada
                  </h3>
                  <p>
                    <strong className='text-neutral-900'>Parking: </strong>
                    {place.arrival.accessibleParking || '—'}
                  </p>
                  <p>
                    <strong className='text-neutral-900'>Cercanía: </strong>
                    {place.arrival.proximity || '—'}
                  </p>
                  <p>
                    <strong className='text-neutral-900'>
                      Disponibilidad:{' '}
                    </strong>
                    {place.arrival.availability || '—'}
                  </p>
                </section>
                <section className='rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5'>
                  <h3 className='mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500'>
                    Entrada
                  </h3>
                  <ul className='space-y-1.5'>
                    <AccessibilityAspectRow ok={place.entrance.noSteps}>
                      {place.entrance.noSteps
                        ? 'Sin escalones en la entrada'
                        : 'Escalones o desnivel en la entrada'}
                    </AccessibilityAspectRow>
                    <AccessibilityAspectRow ok={place.entrance.ramp}>
                      {place.entrance.ramp
                        ? 'Rampa disponible'
                        : 'Sin rampa en la entrada'}
                    </AccessibilityAspectRow>
                  </ul>
                  {place.entrance.accessNote?.trim() ? (
                    <p className='mt-2 border-t border-neutral-200/80 pt-2 text-sm leading-relaxed text-neutral-700'>
                      <span className='font-medium text-neutral-900'>
                        Notas:{' '}
                      </span>
                      {place.entrance.accessNote.trim()}
                    </p>
                  ) : null}
                </section>
                <section className='rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5'>
                  <h3 className='mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500'>
                    Interior
                  </h3>
                  <p>
                    <strong className='text-neutral-900'>Espacio: </strong>
                    {place.interior.space || '—'}
                  </p>
                  <p>
                    <strong className='text-neutral-900'>Baños: </strong>
                    {place.interior.restroom || '—'}
                  </p>
                  <p>
                    <strong className='text-neutral-900'>Ascensor: </strong>
                    {place.interior.elevator || '—'}
                  </p>
                </section>
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          className='mt-2 shrink-0 border-t border-neutral-200/80 pt-2.5'
          style={{ borderColor: COLORS.border }}
        >
          <Button className='h-9 w-full text-sm' variant='default' asChild>
            <a href={directionsUrl} target='_blank' rel='noreferrer'>
              Abrir ruta en Google Maps
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
