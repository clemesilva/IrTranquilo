import { useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePlaces } from '@/context/usePlaces';
import { syncPlaceReviewStats } from '@/lib/syncPlaceReviewStats';
import { supabase } from '@/services/supabase';
import type { PlaceCategory } from '@/types/place';
import {
  ACCESSIBILITY_FIELD_GROUPS,
  type AccessibilityReviewKey,
} from '@/types/reviewAccessibility';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { TriStateAccessibilityChip } from '@/components/reviews/TriStateAccessibilityChip';
import { MediaUpload, createEmptyMediaState, type MediaUploadState } from '@/components/reviews/MediaUpload';
import { CategorySelector } from '@/components/places/CategorySelector';
import { mapGoogleTypeToCategory } from '../../lib/googleCategory';
import { reviewMediaBasePathForPlace } from '@/lib/reviewMediaPaths';

function createEmptyAccessibilityNullable(): Record<
  AccessibilityReviewKey,
  boolean | null
> {
  return Object.fromEntries(
    ACCESSIBILITY_FIELD_GROUPS.flatMap((g) =>
      g.fields.map((f) => [f.key, null]),
    ),
  ) as Record<AccessibilityReviewKey, boolean | null>;
}

export type AddPlacePanelProps = {
  draftLatLng: [number, number] | null;
  onDraftLatLngChange: (next: [number, number] | null) => void;
  onClose: () => void;
  onSaved: (placeId: number) => void;
  /** Clases extra en el contenedor raíz (ej. altura máxima en modal) */
  className?: string;
};

export function AddPlacePanel({
  draftLatLng,
  onDraftLatLngChange,
  onClose,
  onSaved,
  className = '',
}: AddPlacePanelProps) {
  const { refreshPlaces } = usePlaces();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState<string[] | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [googleRatingsTotal, setGoogleRatingsTotal] = useState<number | null>(
    null,
  );
  const [googlePhotoUrl, setGooglePhotoUrl] = useState<string | null>(null);
  const [wheelchairAccessible, setWheelchairAccessible] = useState<
    boolean | null
  >(null);
  const [priceLevel, setPriceLevel] = useState<number | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');

  const [accessibility, setAccessibility] = useState(() =>
    createEmptyAccessibilityNullable(),
  );

  const [media, setMedia] = useState<MediaUploadState>(createEmptyMediaState());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const {
    ready: googleReady,
    isLoading: googleLoading,
    error: googleError,
    suggestions,
    setSuggestions,
    fetchSuggestions,
    getDetails,
  } = usePlacesAutocomplete();

  const canSave = useMemo(() => {
    return (
      placeQuery.trim().length > 1 &&
      category !== null &&
      address.trim().length > 3 &&
      draftLatLng !== null &&
      Number.isFinite(draftLatLng[0]) &&
      Number.isFinite(draftLatLng[1])
    );
  }, [placeQuery, category, address, draftLatLng]);

  async function handleSelectSuggestion(placeId: string) {
    try {
      const d = await getDetails(placeId);
      setAddress(d.address);
      setPlaceQuery(d.name);
      onDraftLatLngChange([d.latitude, d.longitude]);
      setOpeningHours(d.openingHours?.weekdayText ?? null);
      setPhone(d.phone);
      setWebsite(d.website);
      setGoogleRating(d.googleRating);
      setGoogleRatingsTotal(d.googleRatingsTotal);
      setGooglePhotoUrl(d.googlePhotoUrl);
      setWheelchairAccessible(d.wheelchairAccessible);
      setPriceLevel(d.priceLevel);
      setCategory(mapGoogleTypeToCategory(d.rawTypes));
      setSuggestions([]);
      setShowDropdown(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Error seleccionando el lugar.',
      );
    }
  }

  async function handleSave() {
    if (!canSave || !draftLatLng) return;
    setIsSaving(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('Debes iniciar sesión para guardar.');
      if (!category) throw new Error('Elige una categoría.');

      const placeName = placeQuery.trim();
      if (placeName.length <= 1) {
        throw new Error('Busca y selecciona un lugar.');
      }

      const placeInsert = {
        name: placeName,
        category,
        address: address.trim(),
        latitude: draftLatLng[0],
        longitude: draftLatLng[1],
        created_by: user.id,
        opening_hours: openingHours,
        phone,
        website,
        google_rating: googleRating,
        google_ratings_total: googleRatingsTotal,
        google_photo_url: googlePhotoUrl,
        wheelchair_accessible: wheelchairAccessible,
        price_level: priceLevel,
      } as const;

      const { data: place, error: placeError } = await supabase
        .from('places')
        .insert(placeInsert)
        .select('id')
        .single();

      if (placeError) throw placeError;

      // Crear registro inicial de accesibilidad con dato de Google (si existe)
      const googleWheelchair = wheelchairAccessible ?? null;
      const { error: googleAccErr } = await supabase
        .from('place_accessibility_reviews')
        .insert({
          place_id: place.id,
          review_id: null,
          source: 'google',
          ramp_available: googleWheelchair,
          wide_entrance: googleWheelchair,
          parking_accessible: null,
          signage_clear: null,
          mechanical_stairs: null,
          elevator_available: null,
          accessible_bathroom: null,
          circulation_clear: null,
        });
      if (googleAccErr) {
        // Evitamos dejar el lugar “a medias” si falla el insert inicial de accesibilidad.
        await supabase.from('places').delete().eq('id', place.id);
        throw new Error(
          `Se creó el lugar, pero falló el registro inicial de accesibilidad: ${googleAccErr.message}`,
        );
      }

      const anyAccessibility = Object.values(accessibility).some(
        (v) => v === true,
      );
      const hasMedia = media.photos.length > 0 || media.video !== null;
      const wantsReview =
        rating > 0 ||
        review.trim().length > 0 ||
        anyAccessibility ||
        hasMedia;

      if (wantsReview) {
        const effectiveRating = rating > 0 ? rating : 3;
        const { data: rev, error: reviewError } = await supabase
          .from('reviews')
          .insert({
            place_id: place.id,
            author_id: user.id,
            rating: effectiveRating,
            comment: review.trim() ? review.trim() : null,
          })
          .select('id')
          .single();
        if (reviewError) throw reviewError;
        if (rev?.id) {
          const { error: accErr } = await supabase
            .from('place_accessibility_reviews')
            .insert({
              review_id: rev.id,
              place_id: place.id,
              source: 'user',
              ...accessibility,
            });
          if (accErr) throw accErr;

          // Subir media si hay archivos (ruta relativa al bucket; sin upsert → solo hace falta policy INSERT)
          if (media.photos.length > 0 || media.video) {
            const basePath = reviewMediaBasePathForPlace(placeName);
            const photoUrls: string[] = [];
            for (const photo of media.photos.slice(0, 5)) {
              const ext = photo.name.split('.').pop() ?? 'jpg';
              const path = `${basePath}/${crypto.randomUUID()}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from('review-media')
                .upload(path, photo, {
                  contentType: photo.type || undefined,
                  upsert: false,
                });
              if (upErr) {
                throw new Error(
                  `No se pudo subir la foto "${photo.name}": ${upErr.message}`,
                );
              }
              const { data: u } = supabase.storage
                .from('review-media')
                .getPublicUrl(path);
              if (u.publicUrl) photoUrls.push(u.publicUrl);
            }
            let videoUrl: string | null = null;
            if (media.video) {
              const ext = media.video.name.split('.').pop() ?? 'mp4';
              const path = `${basePath}/video-${crypto.randomUUID()}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from('review-media')
                .upload(path, media.video, {
                  contentType: media.video.type || undefined,
                  upsert: false,
                });
              if (upErr) {
                throw new Error(
                  `No se pudo subir el video: ${upErr.message}`,
                );
              }
              const { data: u } = supabase.storage
                .from('review-media')
                .getPublicUrl(path);
              if (u.publicUrl) videoUrl = u.publicUrl;
            }
            if (photoUrls.length > 0 || videoUrl) {
              await supabase.from('reviews').update({
                ...(photoUrls.length > 0 ? { photo_urls: photoUrls } : {}),
                ...(videoUrl ? { video_url: videoUrl } : {}),
              }).eq('id', rev.id);
            }
          }

          await syncPlaceReviewStats(place.id);
        }
      }

      await refreshPlaces();
      onDraftLatLngChange(null);
      setAccessibility(createEmptyAccessibilityNullable());
      setPhone(null);
      setWebsite(null);
      setGoogleRating(null);
      setGoogleRatingsTotal(null);
      setGooglePhotoUrl(null);
      setWheelchairAccessible(null);
      setPriceLevel(null);
      setPlaceQuery('');
      setAddress('');
      setCategory(null);
      setOpeningHours(null);
      setMedia(createEmptyMediaState());
      onSaved(place.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el lugar.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className={`mx-auto flex w-full max-w-[620px] flex-col gap-3 px-1 pb-1 ${className}`}
    >
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold tracking-tight'>Añadir lugar</h2>
      </div>

      {draftLatLng ? (
        <Badge variant='secondary' className='w-fit'>
          Ubicación fijada en el mapa
        </Badge>
      ) : null}

      <Card size='sm' className='overflow-hidden'>
        {/* El scroll lo maneja el modal (DialogContent) para evitar doble barra. */}
        <CardContent className='space-y-4 px-4 pb-6'>
          <div className='space-y-2'>
            <Label htmlFor='place-search'>Buscar lugar (Google)</Label>
            <div className='relative z-2700'>
              <Input
                id='place-search'
                value={placeQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setPlaceQuery(v);
                  setShowDropdown(true);
                  fetchSuggestions(v);
                }}
                onFocus={() => {
                  setShowDropdown(true);
                  if (placeQuery.trim()) fetchSuggestions(placeQuery);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowDropdown(false), 120);
                }}
                placeholder='Ej: Clínica Las Condes'
                disabled={!googleReady}
              />

              {showDropdown && suggestions.length > 0 ? (
                <div className='absolute z-2800 mt-2 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md'>
                  {suggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type='button'
                      className='block w-full px-3 py-2 text-left text-sm hover:bg-muted'
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(s.placeId)}
                    >
                      <div className='font-medium'>{s.primaryText}</div>
                      {s.secondaryText ? (
                        <div className='text-xs text-muted-foreground'>
                          {s.secondaryText}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              {googleLoading ? (
                <span className='text-xs text-muted-foreground'>Buscando…</span>
              ) : null}
              {googleError ? (
                <span className='text-xs text-destructive'>{googleError}</span>
              ) : null}
            </div>

            <p className='text-xs text-muted-foreground'>
              Elige un resultado de Google para fijar la ubicación en el mapa.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='place-address'>Dirección</Label>
            <Input
              id='place-address'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder='Se completa al seleccionar (puedes editar)'
            />
          </div>

          <div className='space-y-2'>
            <Label>Categoría</Label>
            <CategorySelector
              value={category}
              onChange={(v) => setCategory(v)}
            />
          </div>

          <div className='space-y-2'>
            <Label>Calificación de accesibilidad</Label>
            <div className='flex items-center gap-1'>
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                const active = rating >= v;
                return (
                  <button
                    key={v}
                    type='button'
                    className='p-1'
                    onClick={() => setRating(v)}
                    aria-label={`Calificar ${v} de 5`}
                  >
                    <Star
                      className={
                        active
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }
                      size={18}
                    />
                  </button>
                );
              })}
              <span className='ml-2 text-sm text-muted-foreground'>
                {rating ? `${rating}/5` : 'Haz clic en las estrellas'}
              </span>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Características de accesibilidad</Label>
            <div className='space-y-3'>
              {ACCESSIBILITY_FIELD_GROUPS.map((group) => (
                <div key={group.title} className='space-y-2'>
                  <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    {group.title}
                  </p>
                  <div className='grid grid-cols-2 justify-items-start gap-1.5 sm:grid-cols-2 sm:justify-items-stretch'>
                    {group.fields.map((f) => (
                      <TriStateAccessibilityChip
                        key={f.key}
                        label={f.label}
                        value={accessibility[f.key]}
                        onChange={(next) =>
                          setAccessibility((prev) => ({
                            ...prev,
                            [f.key]: next,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error || googleError ? (
            <div className='rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
              {error ?? googleError}
            </div>
          ) : null}
          <div className='space-y-2'>
            <Label htmlFor='place-description'>Comentario (opcional)</Label>
            <Textarea
              id='place-description'
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder='Describe tu experiencia con la accesibilidad del lugar…'
              className='min-h-[72px]'
            />
          </div>

          <div className='space-y-2'>
            <Label>Fotos y video (opcional)</Label>
            <MediaUpload state={media} onChange={setMedia} />
          </div>

          <div className='flex gap-2 border-t pt-3'>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='flex-1'
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Guardando…' : 'Guardar lugar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
