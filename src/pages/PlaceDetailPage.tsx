import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { PlaceReviewFormDialog } from '@/components/reviews/PlaceReviewFormDialog';
import { useAuth } from '@/context/useAuth';
import { usePlaces } from '@/context/usePlaces';
import { syncPlaceReviewStats } from '@/lib/syncPlaceReviewStats';
import { getCategoryMeta, type PlaceReview } from '@/types/place';
import { supabase } from '@/services/supabase';
import { AppIcons, CategoryIcon } from '@/components/icons/appIcons';
import { COLORS } from '@/styles/colors';
import { ReviewMedia } from '@/components/reviews/ReviewMedia';

type PlaceReportType = 'elevator' | 'ramp' | 'construction' | 'other';

const EXPIRATION_MS: Record<PlaceReportType, number> = {
  elevator: 7 * 24 * 60 * 60 * 1000,
  ramp: 3 * 24 * 60 * 60 * 1000,
  construction: 30 * 24 * 60 * 60 * 1000,
  other: 24 * 60 * 60 * 1000,
};

const REPORT_LABELS: Record<PlaceReportType, string> = {
  elevator: 'Ascensor fuera de servicio',
  ramp: 'Rampa bloqueada o en mal estado',
  construction: 'Obras en la entrada',
  other: 'Otro problema',
};

function ReportTypeIcon({ type }: { type: PlaceReportType }) {
  switch (type) {
    case 'elevator':
      return <AppIcons.Building2 className='h-4 w-4' aria-hidden />;
    case 'ramp':
      return <AppIcons.Accessibility className='h-4 w-4' aria-hidden />;
    case 'construction':
      return <AppIcons.Construction className='h-4 w-4' aria-hidden />;
    case 'other':
      return <AppIcons.CircleHelp className='h-4 w-4' aria-hidden />;
  }
}

interface PlaceReportRow {
  id: number;
  type: PlaceReportType;
  description: string | null;
  expires_at: string;
  created_at: string | null;
}

function initials(name: string | null | undefined) {
  const s = (name ?? '').trim();
  if (!s) return 'U';
  return s[0]?.toUpperCase() ?? 'U';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const placeId = id ? Number(id) : NaN;

  const { user } = useAuth();
  const {
    getPlaceById,
    reviewsForPlace,
    accessibilityConsensusForPlace,
    refreshPlaces,
  } = usePlaces();

  const place = Number.isFinite(placeId) ? getPlaceById(placeId) : undefined;

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensus, setConsensus] = useState<Awaited<
    ReturnType<typeof accessibilityConsensusForPlace>
  > | null>(null);
  const [activeReports, setActiveReports] = useState<PlaceReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] =
    useState<PlaceReportType | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  /** Evita re-disparar sync al cambiar la referencia de `place` tras refreshPlaces. */
  const statsHealDoneRef = useRef(false);

  useEffect(() => {
    statsHealDoneRef.current = false;
  }, [placeId]);

  const reloadLists = useCallback(async () => {
    if (!Number.isFinite(placeId)) return;
    setReviewsLoading(true);
    setConsensusLoading(true);
    setReportsLoading(true);
    try {
      const [revRows, cons, reportsRes] = await Promise.all([
        reviewsForPlace(placeId),
        accessibilityConsensusForPlace(placeId),
        supabase
          .from('place_reports')
          .select('*')
          .eq('place_id', placeId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ]);
      setReviews(revRows);
      setConsensus(cons);
      if (reportsRes.error) {
        console.error('Error fetching place reports', reportsRes.error);
        setActiveReports([]);
      } else {
        setActiveReports((reportsRes.data || []) as PlaceReportRow[]);
      }
    } catch (e) {
      console.error('Error cargando reseñas o consenso:', e);
    } finally {
      setReviewsLoading(false);
      setConsensusLoading(false);
      setReportsLoading(false);
    }
  }, [placeId, reviewsForPlace, accessibilityConsensusForPlace]);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

  /** Una sola vez por visita: alinea places.review_count con la tabla reviews si hubo desfase. */
  useEffect(() => {
    if (!Number.isFinite(placeId) || !place || reviewsLoading) return;
    if (statsHealDoneRef.current) return;
    if (reviews.length === 0) return;

    const avgRev = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const countMismatch = reviews.length !== place.reviewCount;
    const avgMismatch = Math.abs(avgRev - place.avgRating) > 0.05;
    if (!countMismatch && !avgMismatch) return;

    statsHealDoneRef.current = true;
    void (async () => {
      try {
        await syncPlaceReviewStats(placeId);
        await refreshPlaces();
      } catch (e) {
        console.warn('syncPlaceReviewStats', e);
        statsHealDoneRef.current = false;
      }
    })();
  }, [placeId, place, reviews, reviewsLoading, refreshPlaces]);

  /** Cabecera alineada con la lista real de reseñas (evita desfase con places.review_count). */
  const headerReviewStats = useMemo(() => {
    if (!place) return { avg: 0, count: 0 };
    if (reviewsLoading) {
      return { avg: place.avgRating, count: place.reviewCount };
    }
    if (reviews.length > 0) {
      const count = reviews.length;
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / count;
      return { avg, count };
    }
    return { avg: place.avgRating, count: place.reviewCount };
  }, [place, reviews, reviewsLoading]);

  const directionsUrl =
    place != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
      : '#';

  const handleShare = async () => {
    if (!place) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, text: place.address, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  };

  const handleOpenReport = () => {
    setSelectedReportType(null);
    setReportDescription('');
    setReportError(null);
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!place || !user || !selectedReportType) {
      setReportError(
        !user
          ? 'Debes iniciar sesión para reportar un problema.'
          : 'Elige un tipo de problema.',
      );
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      const expiresAt = new Date(
        Date.now() + EXPIRATION_MS[selectedReportType],
      ).toISOString();
      const { error } = await supabase.from('place_reports').insert({
        place_id: place.id,
        user_id: user.id,
        type: selectedReportType,
        description: reportDescription.trim() || null,
        expires_at: expiresAt,
      });
      if (error) throw error;
      setReportDialogOpen(false);
      setSelectedReportType(null);
      setReportDescription('');
      await reloadLists();
      await refreshPlaces();
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el reporte. Intenta nuevamente.',
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  function timeAgo(dateIso: string | null) {
    if (!dateIso) return null;
    const diff = Date.now() - new Date(dateIso).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return 'Hace menos de 1 hora';
    if (hours < 24) {
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    }
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  function timeUntil(dateIso: string) {
    const diff = new Date(dateIso).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const days = Math.floor(hours / 24);
    if (hours < 24) {
      return `Expira en ${hours} hora${hours > 1 ? 's' : ''}`;
    }
    return `Expira en ${days} día${days > 1 ? 's' : ''}`;
  }

  const precioLabel: Record<number, string> = {
    0: 'Gratis',
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$',
  };

  if (!place) {
    return (
      <div className='mx-auto w-full max-w-[min(92rem,100%-2rem)] px-4 py-6 sm:px-6 lg:px-8'>
        <Button
          type='button'
          variant='ghost'
          className='px-0'
          onClick={() =>
            navigate(`/?place=${placeId}`, { state: { mapFullscreen: true } })
          }
        >
          ← Volver al mapa
        </Button>
        <p className='mt-4 text-sm text-muted-foreground'>
          No se encontró el lugar.
        </p>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-[min(72rem,100%-2rem)] px-4 py-5 sm:px-6 lg:px-8'>
      <Button
        type='button'
        variant='ghost'
        className='mb-3 px-0 text-sm'
        onClick={() =>
          navigate(`/?place=${placeId}`, { state: { mapFullscreen: true } })
        }
      >
        ← Volver al mapa
      </Button>

      {/* Header card */}
      <header
        className='overflow-hidden rounded-2xl border bg-white shadow-sm'
        style={{ borderColor: COLORS.border }}
      >
        {/* Hero imagen */}
        <div className='relative h-44 w-full bg-neutral-100 sm:h-56'>
          {place.googlePhotoUrl ? (
            <img
              src={place.googlePhotoUrl}
              alt={place.name}
              className='h-full w-full object-cover'
              loading='lazy'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <CategoryIcon
                category={place.category}
                size={48}
                className='text-neutral-300'
              />
            </div>
          )}
          {/* Gradiente inferior */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent' />
          {/* Badge categoría sobre imagen */}
          <span
            className='absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm'
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <CategoryIcon
              category={place.category}
              size={13}
              className='text-white'
            />
            {getCategoryMeta(place.category).label}
          </span>
        </div>

        {/* Info — título arriba, luego dos columnas: datos | botones */}
        <div className='px-5 py-4'>
          {/* Nombre + íconos llegar/compartir alineados */}
          <div className='flex items-start justify-between gap-3'>
            <h1 className='text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl'>
              {place.name}
            </h1>
            <div className='flex shrink-0 items-center gap-1.5'>
              <a
                href={directionsUrl}
                target='_blank'
                rel='noreferrer'
                aria-label='Cómo llegar'
                className='flex h-9 w-9 items-center justify-center rounded-xl text-white sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm sm:font-semibold'
                style={{ backgroundColor: COLORS.primary }}
              >
                <AppIcons.Send className='h-4 w-4 shrink-0' aria-hidden />
                <span className='hidden'>Cómo llegar</span>
              </a>
              <button
                type='button'
                onClick={handleShare}
                aria-label='Compartir'
                className='flex h-9 w-9 items-center justify-center rounded-xl border sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm sm:font-semibold'
                style={{ borderColor: COLORS.border, color: COLORS.text }}
              >
                <AppIcons.Share2 className='h-4 w-4 shrink-0' aria-hidden />
                <span className='hidden'>Compartir</span>
              </button>
            </div>
          </div>

          <div className='mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            {/* Columna izquierda: rating + contacto */}
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                <span className='text-xl font-bold tabular-nums text-neutral-900'>
                  {headerReviewStats.avg.toFixed(1).replace('.', ',')}
                </span>
                <div className='flex items-center gap-0.5'>
                  {Array.from({ length: 5 }, (_, i) => (
                    <AppIcons.Star
                      key={i}
                      className='h-5 w-5'
                      aria-hidden
                      style={{
                        color:
                          i < Math.round(headerReviewStats.avg)
                            ? COLORS.primary
                            : '#E2E8F0',
                      }}
                    />
                  ))}
                </div>
                <AppIcons.Accessibility
                  size={20}
                  style={{ color: COLORS.primary }}
                  aria-hidden
                />
                <span className='text-sm text-neutral-500'>
                  · {headerReviewStats.count}{' '}
                  {headerReviewStats.count === 1 ? 'reseña' : 'reseñas'}
                </span>
                {place.googleRating != null && (
                  <span className='text-xs text-neutral-400'>
                    · {place.googleRating} en Google (
                    {place.googleRatingsTotal ?? 0})
                  </span>
                )}
              </div>

              <div className='mt-2.5 flex flex-col gap-y-1.5 text-sm'>
                <span className='flex items-center gap-1.5 text-neutral-600'>
                  <AppIcons.MapPin className='h-4 w-4 shrink-0' aria-hidden />
                  {place.address}
                </span>
                <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
                  {place.phone ? (
                    <a
                      href={`tel:${place.phone}`}
                      className='flex sm:hidden items-center gap-1.5 hover:underline'
                      style={{ color: COLORS.primary }}
                    >
                      <AppIcons.Phone className='h-4 w-4' aria-hidden />
                      {place.phone}
                    </a>
                  ) : null}
                  {place.phone ? (
                    <a
                      href={`tel:${place.phone}`}
                      className='hidden sm:flex items-center gap-1.5 hover:underline'
                      style={{ color: COLORS.primary }}
                    >
                      <AppIcons.Phone className='h-4 w-4' aria-hidden />
                      {place.phone}
                    </a>
                  ) : null}
                  {place.website ? (
                    <a
                      href={place.website}
                      target='_blank'
                      rel='noreferrer'
                      className='flex items-center gap-1.5 hover:underline'
                      style={{ color: COLORS.primary }}
                    >
                      <AppIcons.Globe
                        className='h-4 w-4 shrink-0'
                        aria-hidden
                      />
                      {(() => {
                        try {
                          const host = new URL(place.website).hostname.replace(
                            /^www\./,
                            '',
                          );
                          return (
                            <span className='truncate max-w-[180px] sm:max-w-[280px]'>
                              {host}
                            </span>
                          );
                        } catch {
                          return (
                            <span className='truncate max-w-[180px] sm:max-w-[280px]'>
                              Sitio web
                            </span>
                          );
                        }
                      })()}
                    </a>
                  ) : null}
                  {place.priceLevel != null ? (
                    <span className='text-neutral-500'>
                      {precioLabel[place.priceLevel] ?? ''}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Columna derecha: botones siempre en paralelo */}
            <div className='flex shrink-0 gap-2'>
              <PlaceReviewFormDialog
                placeId={place.id}
                onSaved={() => void reloadLists()}
                triggerClassName='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
                triggerStyle={{
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  borderColor: COLORS.primary,
                }}
              />
              <Button
                type='button'
                variant='outline'
                className='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
                style={{
                  backgroundColor: '#fefce8',
                  color: '#92400e',
                  borderColor: '#fde68a',
                }}
                onClick={handleOpenReport}
              >
                <AppIcons.TriangleAlert
                  className='mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4'
                  aria-hidden
                />
                Reportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {reportsLoading ? null : activeReports.length > 0 ? (
        <div className='mt-4 space-y-2'>
          {activeReports.map((r) => (
            <div
              key={r.id}
              className='rounded-lg border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900'
            >
              <div className='flex items-center gap-2 font-semibold'>
                <AppIcons.TriangleAlert className='h-4 w-4' aria-hidden />
                <ReportTypeIcon type={r.type} />
                <span>{REPORT_LABELS[r.type]}</span>
              </div>
              <div className='mt-1 text-xs text-amber-900/80'>
                <span>
                  {timeAgo(r.created_at) ?? 'Reporte reciente'} ·{' '}
                  {timeUntil(r.expires_at)}
                </span>
              </div>
              {r.description ? (
                <p className='mt-1 text-xs text-amber-950'>{r.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <AccessibilityConsensusGrid
        className='mt-4'
        consensus={consensus}
        loading={consensusLoading}
        collapseOnMobile
      />

      <section className='mt-5'>
        <h2 className='text-sm font-semibold uppercase tracking-wider text-neutral-500'>
          Reseñas
        </h2>

        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-flow-col xl:auto-cols-[calc((100%-2rem)/3)] xl:gap-4 xl:overflow-x-auto xl:overscroll-x-contain xl:scroll-smooth xl:snap-x xl:snap-mandatory xl:pb-1'>
          {reviewsLoading ? (
            <p className='text-sm text-neutral-500 lg:col-span-2 xl:col-span-3'>
              Cargando reseñas…
            </p>
          ) : reviews.length === 0 ? (
            <p className='text-sm text-neutral-600 lg:col-span-2 xl:col-span-3'>
              Sin reseñas aún.
            </p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className='rounded-2xl border border-neutral-200/80 bg-white p-4 xl:snap-start'
              >
                <div className='flex items-start gap-3'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80'>
                    {initials(r.authorName ?? r.authorId ?? null)}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                      <span className='text-sm font-semibold text-neutral-900'>
                        {r.authorName ?? 'Usuario'}
                      </span>
                      {formatDate(r.createdAt ?? null) ? (
                        <span className='text-xs text-neutral-500'>
                          {formatDate(r.createdAt ?? null)}
                        </span>
                      ) : null}
                    </div>
                    <div className='mt-1 text-sm text-neutral-700'>
                      <span className='font-medium tabular-nums'>
                        {r.rating}/5
                      </span>{' '}
                      <AppIcons.Star
                        className='inline h-4 w-4 text-amber-500'
                        aria-hidden
                      />
                    </div>
                    {r.comment ? (
                      <p className='mt-2 text-sm leading-relaxed text-neutral-700'>
                        {r.comment}
                      </p>
                    ) : null}
                    <ReviewMedia
                      photoUrls={r.photoUrls ?? []}
                      videoUrl={r.videoUrl}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className='w-[calc(100vw-2rem)] max-w-sm rounded-3xl p-0 overflow-hidden sm:max-w-sm'>
          {/* Header con fondo suave */}
          <div
            className='px-5 pt-5 pb-3'
            style={{
              background: 'linear-gradient(135deg, #fef9f0 0%, #fef3e2 100%)',
            }}
          >
            <div className='flex items-center gap-2.5 mb-0.5'>
              <div
                className='flex h-8 w-8 items-center justify-center rounded-xl'
                style={{ backgroundColor: '#fde68a' }}
              >
                <AppIcons.TriangleAlert
                  className='h-4 w-4'
                  style={{ color: '#92400e' }}
                  aria-hidden
                />
              </div>
              <DialogTitle className='text-base font-bold text-neutral-900'>
                ¿Qué problema encontraste?
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-neutral-500 ml-[42px]'>
              El reporte expira automáticamente.
            </DialogDescription>
          </div>

          <div className='px-5 pb-5 space-y-3'>
            {/* Opciones de tipo */}
            <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2'>
              {(['elevator', 'ramp', 'construction', 'other'] as const).map(
                (type) => {
                  const selected = selectedReportType === type;
                  return (
                    <button
                      key={type}
                      type='button'
                      onClick={() => setSelectedReportType(type)}
                      className='flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-all'
                      style={
                        selected
                          ? {
                              borderColor: COLORS.primary,
                              backgroundColor: `${COLORS.primary}12`,
                              color: COLORS.primary,
                            }
                          : {
                              borderColor: '#e5e7eb',
                              backgroundColor: '#fff',
                              color: '#374151',
                            }
                      }
                    >
                      <span
                        className='flex h-6 w-6 shrink-0 items-center justify-center rounded-lg'
                        style={
                          selected
                            ? { backgroundColor: COLORS.primary, color: '#fff' }
                            : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                        }
                      >
                        <ReportTypeIcon type={type} />
                      </span>
                      {REPORT_LABELS[type]}
                    </button>
                  );
                },
              )}
            </div>

            {/* Descripción */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-neutral-700'>
                Describe el problema{' '}
                <span className='font-normal text-neutral-400'>(opcional)</span>
              </p>
              <Textarea
                placeholder='Ej: La rampa está bloqueada por una reja.'
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className='min-h-[64px] rounded-xl border-neutral-200 resize-none text-sm focus-visible:ring-1'
                style={
                  { '--tw-ring-color': COLORS.primary } as React.CSSProperties
                }
              />
            </div>

            {reportError ? (
              <p className='text-sm text-red-500 flex items-center gap-1.5'>
                <AppIcons.TriangleAlert
                  className='h-4 w-4 shrink-0'
                  aria-hidden
                />
                {reportError}
              </p>
            ) : null}

            {/* Botones */}
            <div className='flex gap-2 pt-1'>
              <Button
                type='button'
                variant='outline'
                className='flex-1 rounded-2xl border-neutral-200 text-neutral-600'
                onClick={() => setReportDialogOpen(false)}
                disabled={reportSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type='button'
                className='flex-1 rounded-2xl font-semibold'
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
                style={{
                  backgroundColor: COLORS.primary,
                  borderColor: COLORS.primary,
                  color: '#fff',
                }}
              >
                {reportSubmitting ? 'Enviando…' : 'Reportar problema'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
