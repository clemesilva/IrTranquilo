import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { PlaceReviewFormDialog } from '@/components/reviews/PlaceReviewFormDialog';
import { useAuth } from '@/context/useAuth';
import { usePlaces } from '@/context/usePlaces';
import { PLACE_CATEGORY_LABEL_ES, type PlaceReview } from '@/types/place';

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

  useAuth();
  const { getPlaceById, reviewsForPlace, accessibilityConsensusForPlace } =
    usePlaces();

  const place = Number.isFinite(placeId) ? getPlaceById(placeId) : undefined;

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensus, setConsensus] = useState<Awaited<
    ReturnType<typeof accessibilityConsensusForPlace>
  > | null>(null);

  const reloadLists = useCallback(async () => {
    if (!place) return;
    setReviewsLoading(true);
    setConsensusLoading(true);
    try {
      const [revRows, cons] = await Promise.all([
        reviewsForPlace(place.id),
        accessibilityConsensusForPlace(place.id),
      ]);
      setReviews(revRows);
      setConsensus(cons);
    } finally {
      setReviewsLoading(false);
      setConsensusLoading(false);
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
          <h1 className='text-2xl font-semibold tracking-tight text-neutral-900'>
            {place.name}
          </h1>
          <p className='mt-1.5 text-sm text-neutral-600'>
            {PLACE_CATEGORY_LABEL_ES[place.category]}
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
        </header>

        <div className='flex min-w-0 flex-1 shrink-0 sm:w-auto sm:flex-none sm:justify-end'>
          <PlaceReviewFormDialog
            placeId={place.id}
            onSaved={() => void reloadLists()}
            triggerClassName='w-full sm:w-auto'
          />
        </div>
      </div>

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
    </div>
  );
}
