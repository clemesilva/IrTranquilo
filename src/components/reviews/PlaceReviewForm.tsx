import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { RatingExplainerDialog } from '@/components/reviews/RatingExplainerDialog';
import { COLORS } from '@/styles/colors';
import { Star } from 'lucide-react';
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
import {
  MediaUpload,
  createEmptyMediaState,
  type MediaUploadState,
} from './MediaUpload';

type PlaceReviewFormProps = {
  placeId: number;
  className?: string;
  onSaved?: () => void;
};

export function PlaceReviewForm({
  placeId,
  className = '',
  onSaved,
}: PlaceReviewFormProps) {
  const { isAuthenticated, user } = useAuth();
  const { myReviewWithAccessibility, submitPlaceReview } = usePlaces();

  const [loadingMine, setLoadingMine] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [accessibility, setAccessibility] = useState<AccessibilityReviewValues>(
    createEmptyAccessibilityValues(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [media, setMedia] = useState<MediaUploadState>(createEmptyMediaState());

  const loadMine = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoadingMine(false);
      setHasExisting(false);
      setRating(0);
      setComment('');
      setAccessibility(createEmptyAccessibilityValues());
      setMedia(createEmptyMediaState());
      return;
    }
    setLoadingMine(true);
    setError(null);
    try {
      const mine = await myReviewWithAccessibility(placeId);
      if (mine) {
        setHasExisting(true);
        setRating(mine.rating ?? 0);
        setComment(mine.comment ?? '');
        setAccessibility(mine.accessibility);
        setMedia({
          photos: [],
          photoPreviews: [],
          video: null,
          existingPhotoUrls: mine.photoUrls ?? [],
          existingVideoUrl: mine.videoUrl ?? null,
        });
      } else {
        setHasExisting(false);
        setRating(0);
        setComment('');
        setAccessibility(createEmptyAccessibilityValues());
        setMedia(createEmptyMediaState());
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo cargar tu reseña.');
    } finally {
      setLoadingMine(false);
    }
  }, [isAuthenticated, user, myReviewWithAccessibility, placeId]);

  useEffect(() => {
    void loadMine(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadMine]);

  const handleClickPublish = () => {
    if (!isAuthenticated || isSubmitting || loadingMine) return;
    if (hasExisting) {
      void handleSubmit(rating);
    } else {
      setShowRatingDialog(true);
    }
  };

  const handleSubmit = async (confirmedRating: number) => {
    setShowRatingDialog(false);
    setRating(confirmedRating);
    if (!isAuthenticated || confirmedRating < 1 || confirmedRating > 5) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitPlaceReview(
        placeId,
        confirmedRating,
        comment.trim() || null,
        accessibility,
        {
          newPhotos: media.photos,
          newVideo: media.video,
          retainPhotoUrls: media.existingPhotoUrls,
          retainVideoUrl: media.existingVideoUrl,
        },
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
      <>
        <div className={cn('flex flex-1 flex-col items-center justify-center px-5 py-8', className)} />
        <LoginDialog
          open
          onOpenChange={() => {}}
          title='Inicia sesión para dejar una reseña'
        />
      </>
    );
  }

  if (loadingMine) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center px-5 py-10 text-sm text-neutral-500',
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
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white',
        className,
      )}
    >
      <div className='min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3'>
        <div className='space-y-3'>
          {/* Checklist */}
          <section className='space-y-3'>
            <div>
              <p className='text-sm font-semibold text-neutral-900'>
                ¿Qué características de accesibilidad tiene este lugar?
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
                      description={f.description}
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

          {/* Comentario */}
          <section className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Comentario (opcional)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder='Describe tu experiencia... ej: la rampa tiene barandas pero es muy empinada'
              className='w-full resize-none rounded-lg border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
              rows={4}
            />
          </section>

          {/* Rating */}
          <section className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Calificación de accesibilidad
            </p>
            <div
              className='flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors'
              style={{ borderColor: rating ? COLORS.primary : '#E5E7EB' }}
              onClick={() => setShowRatingDialog(true)}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowRatingDialog(true)}
            >
              <div className='flex gap-0.5'>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={18}
                    strokeWidth={i < rating ? 0 : 1.5}
                    style={{
                      fill: i < rating ? COLORS.primary : 'transparent',
                      color: i < rating ? COLORS.primary : '#D1D5DB',
                    }}
                  />
                ))}
              </div>
              <span style={{ color: rating ? COLORS.primary : '#9CA3AF' }}>
                {rating ? ratingHint : 'Seleccionar calificación…'}
              </span>
            </div>
          </section>

          {/* Fotos y video */}
          <section className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              {hasExisting
                ? 'Editar fotos y video (opcional)'
                : 'Fotos y video (opcional)'}
            </p>
            <MediaUpload
              state={media}
              onChange={setMedia}
              variant={hasExisting ? 'edit' : 'create'}
            />
          </section>
        </div>
      </div>

      <div className='shrink-0 space-y-2 border-t-2 border-neutral-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3'>
        {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
        <Button
          type='button'
          className='h-11 w-full text-sm font-semibold'
          onClick={handleClickPublish}
          disabled={isSubmitting || loadingMine || !isAuthenticated}
          style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: '#fff' }}
        >
          {isSubmitting
            ? 'Publicando…'
            : hasExisting
              ? 'Actualizar reseña'
              : 'Publicar reseña'}
        </Button>
      </div>
      <RatingExplainerDialog
        open={showRatingDialog}
        initialRating={rating}
        onConfirm={handleSubmit}
        onCancel={() => setShowRatingDialog(false)}
      />
    </div>
  );
}
