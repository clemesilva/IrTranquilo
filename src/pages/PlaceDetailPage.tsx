import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/useAuth';
import { usePlaces } from '@/context/usePlaces';
import { bandLabelEs } from '@/lib/rating';
import { cn } from '@/lib/utils';
import { PLACE_CATEGORY_LABEL_ES, type PlaceReview } from '@/types/place';

function bandHeaderClasses(
  band: 'recommended' | 'acceptable' | 'not_recommended',
) {
  switch (band) {
    case 'recommended':
      return 'bg-emerald-50 text-emerald-950 ring-emerald-200/80';
    case 'acceptable':
      return 'bg-amber-50 text-amber-950 ring-amber-200/80';
    case 'not_recommended':
      return 'bg-rose-50 text-rose-950 ring-rose-200/80';
  }
}

function asTri(value: boolean | null | undefined) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function cardForTri(value: boolean | null, label: string) {
  if (value === null) return null;
  const ok = value === true;
  return (
    <div
      key={label}
      className={cn(
        'flex items-center justify-between rounded-xl border px-4 py-3',
        ok
          ? 'border-emerald-200/90 bg-emerald-50/95 text-emerald-950'
          : 'border-rose-200/90 bg-rose-50/95 text-rose-950',
      )}
    >
      <span className='text-sm font-medium'>{label}</span>
      <span className='text-lg font-bold' aria-hidden>
        {ok ? '✓' : '✗'}
      </span>
    </div>
  );
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

  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { getPlaceById, reviewsForPlace, createReview } = usePlaces();

  const place = Number.isFinite(placeId) ? getPlaceById(placeId) : undefined;

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [newRating, setNewRating] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setReviewsLoading(true);
    reviewsForPlace(place.id)
      .then((rows) => {
        if (cancelled) return;
        setReviews(rows);
      })
      .finally(() => {
        if (cancelled) return;
        setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [place, reviewsForPlace]);

  const directionsUrl = useMemo(() => {
    if (!place) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }, [place]);

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

  const canSubmit =
    isAuthenticated && newRating >= 1 && newRating <= 5 && !isSubmitting;

  const submit = async () => {
    if (!place) return;
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createReview(place.id, newRating, newComment);
      const rows = await reviewsForPlace(place.id);
      setReviews(rows);
      setNewRating(0);
      setNewComment('');
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'No se pudo publicar la reseña.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!place) {
    return (
      <div className='mx-auto w-full max-w-3xl px-4 py-6'>
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

  const badgeClass = bandHeaderClasses(place.band);

  // Derivaciones (MVP) para cubrir las tarjetas solicitadas sin nuevas columnas.
  const triParkingDisponible = place.arrival.availability?.trim() ? true : null;
  const triParkingAccesible = asTri(place.features.accessibleParking);
  const triCercaEntrada =
    place.arrival.proximity === 'near'
      ? true
      : place.arrival.proximity
        ? false
        : null;
  const triSenalizacion =
    place.arrival.accessibleParking === 'good_signage'
      ? true
      : place.arrival.accessibleParking
        ? false
        : null;

  const triSinEscalones = asTri(place.entrance.noSteps);
  const triRampa = asTri(place.entrance.ramp);
  const triAscensor = place.interior.elevator
    ? place.interior.elevator.toLowerCase().includes('yes')
      ? true
      : false
    : null;
  const triAnchoOk = place.entrance.accessNote
    ? place.entrance.accessNote === 'good_access'
      ? true
      : false
    : null;

  const triEspacioso = place.interior.space
    ? place.interior.space === 'spacious'
      ? true
      : false
    : null;
  const triAccesoMesas = triEspacioso;
  const triBano = asTri(place.features.adaptedRestroom);
  const triCirculacion = triEspacioso;

  return (
    <div className='mx-auto w-full max-w-3xl px-4 py-5'>
      <div className='flex items-center justify-between gap-3'>
        <Button
          type='button'
          variant='ghost'
          className='px-0'
          onClick={() => navigate(-1)}
        >
          ← Volver al mapa
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={handleShare}
          aria-label='Compartir'
        >
          <Share2 className='h-4 w-4' />
        </Button>
      </div>

      <header className='mt-3 rounded-2xl border border-neutral-200/80 bg-white p-5'>
        <h1 className='text-2xl font-semibold tracking-tight text-neutral-900'>
          {place.name}
        </h1>
        <div className='mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-700'>
          <span>{PLACE_CATEGORY_LABEL_ES[place.category]}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
              badgeClass,
            )}
          >
            {bandLabelEs(place.band)}
          </span>
        </div>

        <div className='mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className='text-3xl font-semibold tabular-nums text-neutral-900'>
            {place.avgRating.toFixed(1).replace('.', ',')}
          </span>
          <span className='text-sm text-neutral-600'>
            ⭐ · {place.reviewCount}{' '}
            {place.reviewCount === 1 ? 'reseña' : 'reseñas'}
          </span>
        </div>
      </header>

      <section className='mt-5 space-y-4'>
        <h2 className='text-sm font-semibold uppercase tracking-wider text-neutral-500'>
          Accesibilidad
        </h2>

        <div className='space-y-3'>
          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Llegada
            </p>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {cardForTri(triParkingDisponible, 'Parking disponible')}
              {cardForTri(triParkingAccesible, 'Parking accesible')}
              {cardForTri(triCercaEntrada, 'Cerca de entrada')}
              {cardForTri(triSenalizacion, 'Señalización clara')}
            </div>
          </div>

          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Entrada
            </p>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {cardForTri(triSinEscalones, 'Sin escalones')}
              {cardForTri(triRampa, 'Rampa disponible')}
              {cardForTri(triAscensor, 'Ascensor')}
              {cardForTri(triAnchoOk, 'Ancho de entrada OK')}
            </div>
          </div>

          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Interior
            </p>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {cardForTri(triEspacioso, 'Espacioso')}
              {cardForTri(triAccesoMesas, 'Acceso a mesas')}
              {cardForTri(triBano, 'Baño accesible')}
              {cardForTri(triCirculacion, 'Circulación clara')}
            </div>
          </div>
        </div>
      </section>

      <section className='mt-6'>
        <h2 className='text-sm font-semibold uppercase tracking-wider text-neutral-500'>
          Reseñas
        </h2>

        <div className='mt-3 rounded-2xl border border-neutral-200/80 bg-white p-4'>
          {!isAuthenticated ? (
            <div className='flex flex-col gap-2'>
              <p className='text-sm text-neutral-600'>
                Inicia sesión para dejar una reseña.
              </p>
              <Button
                type='button'
                className='h-9'
                onClick={() => signInWithGoogle()}
              >
                Iniciar sesión con Google
              </Button>
            </div>
          ) : (
            <div className='space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
                Deja tu reseña
              </p>
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
                          active ? 'text-amber-400' : 'text-neutral-200',
                        )}
                      >
                        {'★'}
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
                onClick={submit}
                disabled={!canSubmit}
              >
                {isSubmitting ? 'Publicando…' : 'Publicar reseña'}
              </Button>
            </div>
          )}
        </div>

        <div className='mt-4 space-y-3'>
          {reviewsLoading ? (
            <p className='text-sm text-neutral-500'>Cargando reseñas…</p>
          ) : reviews.length === 0 ? (
            <p className='text-sm text-neutral-600'>Sin reseñas aún.</p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className='rounded-2xl border border-neutral-200/80 bg-white p-4'
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
        <div className='mt-3 shrink-0'>
          <Button
            type='button'
            className='h-9 w-full text-sm'
            onClick={() => navigate(`/lugares/${place.id}`)}
          >
            Ver detalle completo
          </Button>
        </div>

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
