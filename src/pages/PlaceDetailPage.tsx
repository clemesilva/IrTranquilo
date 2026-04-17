import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { PlaceReviewFormDialog } from '@/components/reviews/PlaceReviewFormDialog';
import { useAuth } from '@/context/useAuth';
import { usePlaces } from '@/context/usePlaces';
import { getCategoryMeta, type PlaceReview } from '@/types/place';
import { supabase } from '@/services/supabase';

type PlaceReportType = 'elevator' | 'ramp' | 'construction' | 'other';

const EXPIRATION_MS: Record<PlaceReportType, number> = {
  elevator: 7 * 24 * 60 * 60 * 1000,
  ramp: 3 * 24 * 60 * 60 * 1000,
  construction: 30 * 24 * 60 * 60 * 1000,
  other: 24 * 60 * 60 * 1000,
};

const REPORT_LABELS: Record<PlaceReportType, string> = {
  elevator: '🛗 Ascensor fuera de servicio',
  ramp: '♿ Rampa bloqueada o en mal estado',
  construction: '🚧 Obras en la entrada',
  other: '❓ Problema reportado',
};

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

  const reloadLists = useCallback(async () => {
    if (!place) return;
    setReviewsLoading(true);
    setConsensusLoading(true);
    setReportsLoading(true);
    try {
      const [revRows, cons, reportsRes] = await Promise.all([
        reviewsForPlace(place.id),
        accessibilityConsensusForPlace(place.id),
        supabase
          .from('place_reports')
          .select('*')
          .eq('place_id', place.id)
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
    } finally {
      setReviewsLoading(false);
      setConsensusLoading(false);
      setReportsLoading(false);
    }
  }, [place, reviewsForPlace, accessibilityConsensusForPlace]);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

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
          onClick={() => navigate(-1)}
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
    <div className='mx-auto w-full max-w-[min(92rem,100%-2rem)] px-4 py-5 sm:px-6 lg:px-8'>
      <div className='flex items-center justify-between gap-3'>
        <Button
          type='button'
          variant='ghost'
          className='px-0'
          onClick={() => navigate(-1)}
        >
          ← Volver al mapa
        </Button>
      </div>

      <div className='mt-3 flex items-stretch justify-between gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4'>
        <header className='min-w-0 flex-1 rounded-xl border border-neutral-200/80 bg-white px-4 py-3'>
          {place.googlePhotoUrl ? (
            <img
              src={place.googlePhotoUrl}
              alt={place.name}
              className='mb-3 h-28 w-full rounded-xl object-cover sm:h-36'
              loading='lazy'
            />
          ) : null}
          <h1 className='text-2xl font-semibold tracking-tight text-neutral-900'>
            {place.name}
          </h1>
          <p className='mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1 text-sm text-neutral-700 ring-1 ring-neutral-200/80'>
            <span aria-hidden>{getCategoryMeta(place.category).icon}</span>
            <span>{getCategoryMeta(place.category).label}</span>
          </p>

          <div className='mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5'>
            <span className='text-3xl font-semibold tabular-nums text-neutral-900'>
              {place.avgRating.toFixed(1).replace('.', ',')}
            </span>
            <span className='text-sm text-neutral-600'>
              <span aria-hidden>⭐</span> · {place.reviewCount}{' '}
              {place.reviewCount === 1 ? 'reseña' : 'reseñas'}
            </span>
          </div>

          <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-700'>
            {place.phone ? (
              <a
                href={`tel:${place.phone}`}
                className='underline-offset-2 hover:underline'
              >
                📞 {place.phone}
              </a>
            ) : null}
            {place.website ? (
              <a
                href={place.website}
                target='_blank'
                rel='noreferrer'
                className='underline-offset-2 hover:underline'
              >
                🌐 Sitio web
              </a>
            ) : null}
            {place.priceLevel != null ? (
              <span className='text-neutral-600'>
                {precioLabel[place.priceLevel] ?? ''}
              </span>
            ) : null}
          </div>

          {place.googleRating != null ? (
            <p className='mt-1 text-xs text-neutral-500'>
              ⭐ {place.googleRating} en Google ({place.googleRatingsTotal ?? 0}{' '}
              reseñas)
            </p>
          ) : null}
        </header>

        <div className='flex min-w-0 flex-1 shrink-0 flex-col gap-2 sm:w-auto sm:flex-none sm:items-end sm:justify-end'>
          <PlaceReviewFormDialog
            placeId={place.id}
            onSaved={() => void reloadLists()}
            triggerClassName='w-full sm:w-auto'
          />
          <Button
            type='button'
            variant='outline'
            className='w-full text-sm sm:w-auto'
            onClick={handleOpenReport}
          >
            ⚠️ Reportar problema temporal
          </Button>
        </div>
      </div>

      {reportsLoading ? null : activeReports.length > 0 ? (
        <div className='mt-4 space-y-2'>
          {activeReports.map((r) => (
            <div
              key={r.id}
              className='rounded-lg border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900'
            >
              <div className='flex items-center gap-2 font-semibold'>
                <span>⚠️</span>
                <span>{REPORT_LABELS[r.type]}</span>
              </div>
              <div className='mt-1 text-xs text-amber-900/80'>
                <span>
                  {timeAgo(r.created_at) ?? 'Reporte reciente'} ·{' '}
                  {timeUntil(r.expires_at)}
                </span>
              </div>
              {r.description ? (
                <p className='mt-1 text-xs text-amber-950'>
                  {r.description}
                </p>
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
                      <span aria-hidden>⭐</span>
                    </div>
                    {r.comment ? (
                      <p className='mt-2 text-sm leading-relaxed text-neutral-700'>
                        {r.comment}
                      </p>
                    ) : null}
                    {r.photoUrls && r.photoUrls.length > 0 ? (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {r.photoUrls.map((url, i) => (
                          <a key={i} href={url} target='_blank' rel='noreferrer'>
                            <img
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className='h-20 w-20 rounded-lg object-cover border border-neutral-200 hover:opacity-90 transition'
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {r.videoUrl ? (
                      <video
                        src={r.videoUrl}
                        controls
                        className='mt-3 w-full max-w-xs rounded-lg border border-neutral-200'
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className='mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2'>
        <Button className='h-10 w-full text-sm' asChild>
          <a href={directionsUrl} target='_blank' rel='noreferrer'>
            Abrir ruta en Google Maps
          </a>
        </Button>
        <Button
          type='button'
          className='h-10 w-full text-sm'
          variant='outline'
          onClick={handleShare}
        >
          Compartir
        </Button>
      </footer>

      {/* Derivación a sistema de denuncias según categoría */}
      <div className='mt-4 text-xs text-neutral-500'>
        {(() => {
          const meta = getCategoryMeta(place.category);
          const isPublic = meta.isPublic ?? false;
          return isPublic ? (
            <a
              href='https://www.siac.cl'
              target='_blank'
              rel='noreferrer'
              className='underline-offset-2 hover:underline'
            >
              Denunciar en SIAC (institución pública)
            </a>
          ) : (
            <a
              href='https://www.sernac.cl'
              target='_blank'
              rel='noreferrer'
              className='underline-offset-2 hover:underline'
            >
              Denunciar en SERNAC (empresa privada)
            </a>
          );
        })()}
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Qué problema encontraste?</DialogTitle>
            <DialogDescription>
              Elige el tipo de problema temporal y, si quieres, agrega una
              descripción. El reporte se eliminará automáticamente cuando
              expire.
            </DialogDescription>
          </DialogHeader>
          <div className='mt-3 space-y-3'>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              <Button
                type='button'
                variant={
                  selectedReportType === 'elevator' ? 'default' : 'outline'
                }
                className='justify-start'
                onClick={() => setSelectedReportType('elevator')}
              >
                🛗 Ascensor fuera de servicio
              </Button>
              <Button
                type='button'
                variant={selectedReportType === 'ramp' ? 'default' : 'outline'}
                className='justify-start'
                onClick={() => setSelectedReportType('ramp')}
              >
                ♿ Rampa bloqueada o en mal estado
              </Button>
              <Button
                type='button'
                variant={
                  selectedReportType === 'construction' ? 'default' : 'outline'
                }
                className='justify-start'
                onClick={() => setSelectedReportType('construction')}
              >
                🚧 Obras en la entrada
              </Button>
              <Button
                type='button'
                variant={selectedReportType === 'other' ? 'default' : 'outline'}
                className='justify-start'
                onClick={() => setSelectedReportType('other')}
              >
                ❓ Otro problema
              </Button>
            </div>

            <div className='space-y-1.5'>
              <p className='text-sm font-medium text-neutral-800'>
                Describe el problema (opcional)
              </p>
              <Textarea
                placeholder='Ej: La rampa está bloqueada por una reja.'
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className='min-h-[80px]'
              />
            </div>

            {reportError ? (
              <p className='text-sm text-red-600'>{reportError}</p>
            ) : null}

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setReportDialogOpen(false)}
                disabled={reportSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type='button'
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? 'Enviando…' : 'Reportar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
