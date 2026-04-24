import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Navigation, X } from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlaces } from '@/context/usePlaces';
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { PlaceReviewFormDialog } from '@/components/reviews/PlaceReviewFormDialog';
import { ReviewMedia } from '@/components/reviews/ReviewMedia';
import type { PlaceWithStats } from '@/context/placesContext';
import { formatRelativeTimeEs } from '@/lib/relativeTime';
import type { AccessibilityConsensusMap } from '@/lib/reviewAccessibilityConsensus';
import type { PlaceReview } from '@/types/place';
import { COLORS } from '@/styles/colors';
import { cn } from '@/lib/utils';
import { supabase } from '@/services/supabase';
import { AppIcons } from '@/components/icons/appIcons';

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
          className='text-sm leading-none sm:text-base'
          style={{ color: i < full ? COLORS.primary : '#E2E8F0' }}
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
  onSnapChange?: (snap: number) => void;
}

type PlaceReportType = 'elevator' | 'ramp' | 'construction' | 'other';

const REPORT_LABELS: Record<PlaceReportType, string> = {
  elevator: 'Ascensor fuera de servicio',
  ramp: 'Rampa bloqueada o en mal estado',
  construction: 'Obras en la entrada',
  other: 'Problema reportado',
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

function ReviewLikeButton({
  reviewId,
  initialCount,
  userId,
}: {
  reviewId: number;
  initialCount: number;
  userId: string | undefined;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [reviewId, userId]);

  const toggle = async () => {
    if (!userId || loading) return;
    setLoading(true);
    if (liked) {
      await supabase
        .from('helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from('helpful_votes')
        .insert({ review_id: reviewId, user_id: userId });
      setLiked(true);
      setCount((c) => c + 1);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading || !userId}
      className='flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors'
      style={{
        color: liked ? '#EF4444' : COLORS.textMuted,
        backgroundColor: liked ? '#EF444412' : 'transparent',
      }}
      aria-label={liked ? 'Quitar like' : 'Me fue útil'}
    >
      <Heart className='h-3.5 w-3.5' fill={liked ? '#EF4444' : 'none'} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

function ReviewsCollapsible({
  reviews,
  userId,
}: {
  reviews: PlaceReview[];
  userId: string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='space-y-3'>
      <div className={`relative ${!expanded ? 'max-h-[420px] overflow-hidden' : ''}`}>
        <div className='space-y-3'>
          {reviews.map((r) => (
            <div
              key={r.id}
              className='rounded-xl border p-3'
              style={{ borderColor: COLORS.border }}
            >
              <div className='mb-0.5 flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold text-neutral-900'>
                  {r.authorName ?? 'Usuario'}
                </p>
                {formatRelativeTimeEs(r.createdAt ?? null) && (
                  <p className='shrink-0 text-xs text-neutral-400'>
                    {formatRelativeTimeEs(r.createdAt ?? null)}
                  </p>
                )}
              </div>
              <div className='mb-1.5 flex items-center gap-2'>
                <StarRow rating={r.rating} className='scale-90' />
                <span className='text-xs tabular-nums text-neutral-500'>
                  {r.rating}/5
                </span>
                <div className='ml-auto'>
                  <ReviewLikeButton
                    reviewId={r.id}
                    initialCount={r.helpfulCount ?? 0}
                    userId={userId}
                  />
                </div>
              </div>
              {r.comment ? (
                <p className='text-sm leading-relaxed text-neutral-700'>{r.comment}</p>
              ) : (
                <p className='text-xs italic text-neutral-400'>Sin comentario</p>
              )}
              <ReviewMedia photoUrls={r.photoUrls ?? []} videoUrl={r.videoUrl} />
            </div>
          ))}
        </div>
        {!expanded && (
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-white/95' />
        )}
      </div>
      {reviews.length > 1 && (
        <button
          type='button'
          className='w-full rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm'
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ver menos reseñas' : 'Ver más reseñas'}
        </button>
      )}
    </div>
  );
}

export function PlaceMapSidebar({
  place,
  onClose,
  onSnapChange,
}: PlaceMapSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reviewsForPlace, accessibilityConsensusForPlace } = usePlaces();
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Bottom sheet snap: 0=12vh, 1=38vh, 2=88vh
  const SNAPS: ['12vh', '38vh', '88vh'] = ['12vh', '38vh', '88vh'];
  const [snap, setSnap] = useState(0);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => setSnap(1));
  }, [place.id]);

  useEffect(() => {
    onSnapChange?.(snap);
  }, [snap, onSnapChange]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const dy = dragStartY.current - e.clientY;
    dragStartY.current = null;
    if (dy > 30) setSnap((s) => Math.min(s + 1, 2));
    else if (dy < -30) setSnap((s) => Math.max(s - 1, 0));
    else setSnap((s) => (s < 2 ? s + 1 : 0));
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', place.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, place.id]);

  const toggleFav = async () => {
    if (!user || favLoading) return;
    setFavLoading(true);
    if (isFav) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', place.id);
      setIsFav(false);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, place_id: place.id });
      setIsFav(true);
    }
    setFavLoading(false);
  };

  const [tab, setTab] = useState<PanelTab>('overview');
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [consensus, setConsensus] = useState<AccessibilityConsensusMap | null>(
    null,
  );
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [activeReports, setActiveReports] = useState<PlaceReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
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
    setReportsLoading(true);
    const [rows, c, reportsRes] = await Promise.all([
      reviewsForPlace(place.id),
      accessibilityConsensusForPlace(place.id),
      supabase
        .from('place_reports')
        .select('*')
        .eq('place_id', place.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ]);
    setReviews(rows);
    setConsensus(c);
    if (reportsRes.error) {
      console.error('Error fetching place reports (sidebar)', reportsRes.error);
      setActiveReports([]);
    } else {
      setActiveReports((reportsRes.data || []) as PlaceReportRow[]);
    }
    setReviewsLoading(false);
    setConsensusLoading(false);
    setReportsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    // Evita setState síncrono en el cuerpo del effect (regla de lint del proyecto)
    queueMicrotask(() => {
      if (!cancelled) setConsensusLoading(true);
    });
    void Promise.all([
      accessibilityConsensusForPlace(place.id),
      supabase
        .from('place_reports')
        .select('*')
        .eq('place_id', place.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ]).then(([c, reportsRes]) => {
      if (cancelled) return;
      setConsensus(c);
      if (reportsRes.error) {
        console.error(
          'Error fetching place reports (sidebar init)',
          reportsRes.error,
        );
        setActiveReports([]);
      } else {
        setActiveReports((reportsRes.data || []) as PlaceReportRow[]);
      }
      setConsensusLoading(false);
      setReportsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [place.id, accessibilityConsensusForPlace]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  /** Alineado con la lista cargada desde `reviews`, no solo con `places.review_count`. */
  const headerReviewStats = useMemo(() => {
    if (reviewsLoading || reviews.length === 0) {
      return { avg: place.avgRating, count: place.reviewCount };
    }
    const count = reviews.length;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / count;
    return { avg, count };
  }, [place.avgRating, place.reviewCount, reviews, reviewsLoading]);

  // Compartir eliminado del sidebar (solo queda en detalle completo)

  const bandMeta =
    {
      recommended: {
        label: 'Recomendado',
        bg: `${COLORS.success}18`,
        color: COLORS.success,
      },
      acceptable: {
        label: 'Aceptable',
        bg: `${COLORS.warning}20`,
        color: '#a16207',
      },
      not_recommended: {
        label: 'No recomendado',
        bg: `${COLORS.danger}15`,
        color: COLORS.danger,
      },
    }[place.band] ?? null;

  // Contenido compartido entre mobile y desktop
  const panelContent = (
    <ScrollArea className='min-h-0 flex-1'>
      <div className='px-4 pb-4 pt-5'>
        {/* Nombre + Cerrar */}
        <div className='mb-1 flex items-start justify-between gap-2'>
          <h2
            id='place-map-sidebar-title'
            className='text-lg font-bold leading-tight text-neutral-900 sm:text-xl'
          >
            {place.name}
          </h2>
          <div className='flex shrink-0 items-start gap-0.5 mt-2'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden sm:flex h-7 w-7'
              onClick={toggleFav}
              disabled={favLoading}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{ color: isFav ? '#EF4444' : '#D1D5DB' }}
            >
              <Heart className='h-4 w-4' fill={isFav ? '#EF4444' : 'none'} />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden sm:flex h-7 w-7 text-neutral-400 hover:text-neutral-700'
              onClick={onClose}
              aria-label='Cerrar'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Rating row */}
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <span
            className='text-sm font-semibold tabular-nums'
            style={{ color: COLORS.text }}
          >
            {headerReviewStats.avg.toFixed(1).replace('.', ',')}
          </span>
          <StarRow rating={headerReviewStats.avg} />
          <span className='text-xs text-neutral-500'>
            ({headerReviewStats.count})
          </span>
          <AppIcons.Accessibility
            size={15}
            style={{ color: COLORS.primary }}
            aria-hidden
          />
          {bandMeta && (
            <span
              className='rounded-full px-2.5 py-0.5 text-xs font-semibold'
              style={{ backgroundColor: bandMeta.bg, color: bandMeta.color }}
            >
              {bandMeta.label}
            </span>
          )}
        </div>

        {/* Teléfono + web */}
        {(place.phone || place.website) && (
          <div className='mb-2 flex flex-wrap gap-x-4 gap-y-1'>
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className='flex items-center gap-1.5 text-xs'
                style={{ color: COLORS.primary }}
              >
                <AppIcons.Phone size={13} aria-hidden />
                {place.phone}
              </a>
            )}
            {place.website && (
              <a
                href={place.website}
                target='_blank'
                rel='noreferrer'
                className='flex min-w-0 items-center gap-1.5 text-xs'
                style={{ color: COLORS.primary }}
              >
                <AppIcons.Globe size={13} className='shrink-0' aria-hidden />
                <span className='truncate max-w-[140px]'>
                  {(() => {
                    try {
                      const u = new URL(place.website);
                      return u.hostname.replace(/^www\./, '');
                    } catch {
                      return place.website
                        .replace(/^https?:\/\//, '')
                        .split('/')[0];
                    }
                  })()}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Dirección */}
        <div className='mb-3 flex items-start gap-1.5'>
          <MapPin
            size={13}
            className='mt-0.5 shrink-0'
            style={{ color: COLORS.primary }}
            aria-hidden
          />
          <p className='text-xs leading-snug text-neutral-600'>
            {place.address}
          </p>
        </div>

        {/* Alertas */}
        {!reportsLoading && activeReports.length > 0 && (
          <div className='mb-3 space-y-1.5'>
            {activeReports.map((r) => (
              <div
                key={r.id}
                className='rounded-lg border px-2.5 py-2 text-xs'
                style={{
                  borderColor: COLORS.alertBorder,
                  backgroundColor: COLORS.alertBg,
                  color: '#78350f',
                }}
              >
                <div className='flex items-center gap-1.5 font-semibold'>
                  <AppIcons.TriangleAlert className='h-3.5 w-3.5' aria-hidden />
                  <ReportTypeIcon type={r.type} />
                  <span>{REPORT_LABELS[r.type]}</span>
                </div>
                <p className='mt-0.5 text-[11px] opacity-80'>
                  {timeAgo(r.created_at) ?? 'Reporte reciente'} ·{' '}
                  {timeUntil(r.expires_at)}
                </p>
                {r.description && (
                  <p className='mt-0.5 text-[11px]'>{r.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botones de acción */}
        <div className='mb-4 flex gap-2'>
          <a
            href={directionsUrl}
            target='_blank'
            rel='noreferrer'
            className='flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white'
            style={{ backgroundColor: COLORS.primary }}
          >
            <Navigation size={13} aria-hidden />
            Cómo llegar
          </a>
          <button
            onClick={() => navigate(`/lugares/${place.id}`)}
            className='flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold'
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            Ver detalle
            <span className='text-neutral-400'>›</span>
          </button>
        </div>

        {/* Galería de medios de reseñas */}
        {!reviewsLoading && (reviews.some(r => r.videoUrl) || reviews.some(r => r.photoUrls?.length)) && (
          <div className='mb-4'>
            <ReviewMedia
              videoUrl={reviews.find(r => r.videoUrl)?.videoUrl}
              photoUrls={reviews.flatMap(r => r.photoUrls ?? [])}
            />
          </div>
        )}

        {/* Tabs */}
        <div
          className='mb-2 mt-1 flex border-b'
          style={{ borderColor: COLORS.border }}
        >
          {(
            [
              ['overview', 'Accesibilidad'],
              ['reviews', `Reseñas (${headerReviewStats.count})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className='-mb-px flex-1 border-b-2 py-2 text-center text-xs font-medium transition-colors sm:text-sm'
              style={
                tab === key
                  ? { borderColor: COLORS.primary, color: COLORS.primary }
                  : { borderColor: 'transparent', color: COLORS.textMuted }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenido tabs */}
        {tab === 'overview' && (
          <div className='scale-[0.88] origin-top-left -mb-4'>
            <AccessibilityConsensusGrid
              consensus={consensus}
              loading={consensusLoading}
              heading=''
              headingClassName='hidden'
              variant='compact'
            />
          </div>
        )}

        {tab === 'reviews' && (
          <div className='space-y-3'>
            <div className='flex justify-center'>
              <PlaceReviewFormDialog
                placeId={place.id}
                onSaved={() => void reloadSidebarLists()}
                triggerLabel='Escribir una reseña'
                triggerVariant='outline'
                triggerClassName='h-9 w-fit rounded-full border border-[#1A56A0]/30 bg-white px-4 text-[#1A56A0] shadow-sm hover:bg-[#1A56A0]/5'
              />
            </div>
            {reviewsLoading ? (
              <p className='text-sm text-neutral-500'>Cargando reseñas…</p>
            ) : reviews.length === 0 ? (
              <p className='text-sm leading-relaxed text-neutral-500'>
                No hay reseñas todavía. Sé la primera en dejar una.
              </p>
            ) : (
              <ReviewsCollapsible reviews={reviews} userId={user?.id} />
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <>
      {/* ── MOBILE: bottom sheet con 3 niveles de snap ── */}
      <div
        className='sm:hidden fixed inset-x-0 bottom-0 z-[9050] flex flex-col'
        style={{
          height: SNAPS[snap as 0 | 1 | 2],
          transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
        role='dialog'
        aria-labelledby='place-map-sidebar-title'
      >
        {/* Drag handle */}
        <div
          className='flex w-full cursor-grab touch-none items-center justify-center rounded-t-2xl border-t border-x bg-white pt-3 pb-2 active:cursor-grabbing'
          style={{ borderColor: COLORS.border }}
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
        >
          <div className='h-1 w-10 rounded-full bg-neutral-300' />
        </div>

        {/* Contenido */}
        <div
          className='flex min-h-0 flex-1 flex-col overflow-hidden border-x border-b bg-white shadow-[0_-8px_30px_-8px_rgba(15,23,42,0.18)]'
          style={{ borderColor: COLORS.border }}
        >
          {/* Corazón + Cerrar — mobile */}
          <div className='absolute top-12 right-4 z-10 flex items-center gap-1'>
            <button
              type='button'
              onClick={toggleFav}
              disabled={favLoading}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className='flex h-7 w-7 items-center justify-center rounded-full border bg-white transition-colors'
              style={{
                borderColor: COLORS.border,
                color: isFav ? '#EF4444' : '#D1D5DB',
              }}
            >
              <Heart className='h-4 w-4' fill={isFav ? '#EF4444' : 'none'} />
            </button>
            <button
              type='button'
              onClick={onClose}
              className='flex h-7 w-7 items-center justify-center rounded-full border bg-white text-neutral-400'
              style={{ borderColor: COLORS.border }}
              aria-label='Cerrar'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          {panelContent}
        </div>
      </div>

      {/* ── DESKTOP: panel lateral derecho ── */}
      <div
        className='hidden sm:flex absolute top-0 right-0 bottom-0 z-[9050] w-[min(86vw,24rem)] flex-col animate-in slide-in-from-right-4 pointer-events-auto'
        role='dialog'
        aria-labelledby='place-map-sidebar-title'
      >
        <div
          className='flex min-h-0 h-full flex-col overflow-hidden bg-white shadow-[0_0_40px_-12px_rgba(15,23,42,0.35)] rounded-l-2xl border-y border-l'
          style={{ borderColor: COLORS.border }}
        >
          {panelContent}
        </div>
      </div>
    </>
  );
}
