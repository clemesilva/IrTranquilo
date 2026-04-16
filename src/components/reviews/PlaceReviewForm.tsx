import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/useAuth';
import { usePlaces } from '@/context/usePlaces';
import { cn } from '@/lib/utils';
import {
  ACCESSIBILITY_FIELD_GROUPS,
  createEmptyAccessibilityValues,
  ratingLabelEs,
  type AccessibilityReviewValues,
} from '@/types/reviewAccessibility';
import { TriStateAccessibilityChip } from './TriStateAccessibilityChip';

type PlaceReviewFormProps = {
  placeId: number;
  /** Clases extra en el contenedor del bloque */
  className?: string;
  /** Tras guardar correctamente */
  onSaved?: () => void;
};

export function PlaceReviewForm({
  placeId,
  className = '',
  onSaved,
}: PlaceReviewFormProps) {
  const { isAuthenticated, signInWithGoogle, user } = useAuth();
  const { myReviewWithAccessibility, submitPlaceReview } = usePlaces();

  const [loadingMine, setLoadingMine] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [accessibility, setAccessibility] = useState<AccessibilityReviewValues>(
    createEmptyAccessibilityValues(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  const loadMine = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoadingMine(false);
      setHasExisting(false);
      setRating(0);
      setComment('');
      setAccessibility(createEmptyAccessibilityValues());
      return;
    }
    setLoadingMine(true);
    setError(null);
    try {
      const mine = await myReviewWithAccessibility(placeId);
      if (mine) {
        setHasExisting(true);
        setRating(mine.rating);
        setComment(mine.comment ?? '');
        setAccessibility(mine.accessibility);
      } else {
        setHasExisting(false);
        setRating(0);
        setComment('');
        setAccessibility(createEmptyAccessibilityValues());
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo cargar tu reseña.');
    } finally {
      setLoadingMine(false);
    }
  }, [isAuthenticated, user, myReviewWithAccessibility, placeId]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const canSubmit =
    isAuthenticated &&
    rating >= 1 &&
    rating <= 5 &&
    !isSubmitting &&
    !loadingMine;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitPlaceReview(
        placeId,
        rating,
        comment.trim() || null,
        accessibility,
      );
      await loadMine();
      onSaved?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo publicar la reseña.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingHint = useMemo(() => ratingLabelEs(rating), [rating]);

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          'rounded-xl border border-neutral-200/80 bg-white p-4',
          className,
        )}
      >
        <p className='text-sm text-neutral-600'>
          Inicia sesión para dejar una reseña.
        </p>
        <Button
          type='button'
          className='mt-3 h-10 w-full'
          onClick={() => signInWithGoogle()}
        >
          Iniciar sesión con Google
        </Button>
      </div>
    );
  }

  if (loadingMine) {
    return (
      <div
        className={cn(
          'rounded-xl border border-neutral-200/80 bg-white p-4 text-sm text-neutral-500',
          className,
        )}
      >
        Cargando…
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-4 rounded-xl border border-neutral-200/80 bg-white p-4',
        className,
      )}
    >
      {/* Sección 1: Rating */}
      <section className='space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
          Calificación
        </p>
        <div className='flex flex-wrap items-center gap-1.5'>
          {Array.from({ length: 5 }, (_, i) => {
            const v = i + 1;
            const active = rating >= v;
            return (
              <button
                key={v}
                type='button'
                className='p-1 leading-none hover:opacity-90'
                onClick={() => setRating(v)}
                aria-label={`${v} de 5 estrellas`}
              >
                <span
                  className={cn(
                    'text-3xl leading-none sm:text-4xl',
                    active ? 'text-amber-400' : 'text-neutral-200',
                  )}
                  aria-hidden
                >
                  {'\u2605'}
                </span>
              </button>
            );
          })}
        </div>
        <p className='text-xs font-medium text-neutral-700'>{ratingHint}</p>
      </section>

      {/* Sección 2: Checklist */}
      <section className='space-y-3'>
        <div>
          <p className='text-sm font-semibold text-neutral-900'>
            ¿Qué características tiene este lugar?
          </p>
          <p className='mt-1 text-xs text-neutral-500'>
            Cada ítem es sí o no según tu experiencia en el lugar
          </p>
        </div>
        {ACCESSIBILITY_FIELD_GROUPS.map((group) => (
          <div key={group.title}>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500'>
              {group.title}
            </p>
            <div className='grid grid-cols-2 justify-items-start gap-1.5 sm:justify-items-stretch'>
              {group.fields.map((f) => (
                <TriStateAccessibilityChip
                  key={f.key}
                  label={f.label}
                  value={accessibility[f.key]}
                  onChange={(next) =>
                    setAccessibility((prev) => ({ ...prev, [f.key]: next }))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Sección 3: Comentario */}
      <section className='space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
          Comentario (opcional)
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder='Describe tu experiencia... ej: la rampa tiene barandas pero es muy empinada'
          className='w-full resize-none rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10'
          rows={4}
        />
      </section>

      {error ? <p className='text-sm text-rose-600'>{error}</p> : null}

      {/* Sección 4 */}
      <Button
        type='button'
        className='h-10 w-full text-sm font-semibold'
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {isSubmitting
          ? 'Publicando…'
          : hasExisting
            ? 'Actualizar reseña'
            : 'Publicar reseña'}
      </Button>
    </div>
  );
}
