import { useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePlaces } from '@/context/usePlaces';
import { syncPlaceReviewStats } from '@/lib/syncPlaceReviewStats';
import { supabase } from '@/services/supabase';
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL_ES,
  type PlaceCategory,
} from '@/types/place';
import {
  ACCESSIBILITY_FIELD_GROUPS,
  type AccessibilityReviewKey,
  createEmptyAccessibilityValues,
} from '@/types/reviewAccessibility';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

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

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState<string[] | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');

  const [accessibility, setAccessibility] = useState(() =>
    createEmptyAccessibilityValues(),
  );

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
      name.trim().length > 1 &&
      category !== null &&
      address.trim().length > 3 &&
      draftLatLng !== null &&
      Number.isFinite(draftLatLng[0]) &&
      Number.isFinite(draftLatLng[1])
    );
  }, [name, category, address, draftLatLng]);

  async function handleSelectSuggestion(placeId: string) {
    try {
      const d = await getDetails(placeId);
      setName((prev) => (prev.trim() ? prev : d.name));
      setAddress(d.address);
      setPlaceQuery(d.name);
      onDraftLatLngChange([d.latitude, d.longitude]);
      setOpeningHours(d.openingHours?.weekdayText ?? null);
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

      const placeInsert = {
        name: name.trim(),
        category,
        address: address.trim(),
        latitude: draftLatLng[0],
        longitude: draftLatLng[1],
        created_by: user.id,
        opening_hours: openingHours,
      } as const;

      const { data: place, error: placeError } = await supabase
        .from('places')
        .insert(placeInsert)
        .select('id')
        .single();

      if (placeError) throw placeError;

      const anyAccessibility = Object.values(accessibility).some(Boolean);
      const wantsReview =
        rating > 0 || review.trim().length > 0 || anyAccessibility;

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
              ...accessibility,
            });
          if (accErr) throw accErr;
          await syncPlaceReviewStats(place.id);
        }
      }

      await refreshPlaces();
      onDraftLatLngChange(null);
      setAccessibility(createEmptyAccessibilityValues());
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
            <Label htmlFor='place-name'>Nombre del lugar</Label>
            <Input
              id='place-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: Cafetería Central'
            />
          </div>

          <div className='space-y-2'>
            <Label>Categoría</Label>
            <Select
              value={category ?? undefined}
              onValueChange={(v) => setCategory(v as PlaceCategory)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Elegir categoría' />
              </SelectTrigger>
              <SelectContent
                position='popper'
                align='start'
                sideOffset={6}
                withinPortal
                portalContainer={panelRef.current}
                className='z-[2900]'
              >
                {PLACE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PLACE_CATEGORY_LABEL_ES[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='place-search'>Buscar lugar (Google)</Label>
            <div className='relative z-[2700]'>
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
                <div className='absolute z-[2800] mt-2 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md'>
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

            <div className='space-y-2'>
              <Label htmlFor='place-address'>Dirección</Label>
              <Input
                id='place-address'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='Se completa al seleccionar (puedes editar)'
              />
            </div>

            <p className='text-xs text-muted-foreground'>
              Elige un resultado de Google para fijar la ubicación en el mapa.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='place-description'>Reseña (opcional)</Label>
            <Textarea
              id='place-description'
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder='Describe tu experiencia con la accesibilidad del lugar…'
              className='min-h-[72px]'
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
                  <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                    {group.fields.map((f) => (
                      <label
                        key={f.key}
                        className='flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-sm'
                      >
                        <Checkbox
                          checked={accessibility[f.key]}
                          onCheckedChange={(v) => {
                            const next = Boolean(v);
                            setAccessibility((prev) => ({
                              ...prev,
                              [f.key as AccessibilityReviewKey]: next,
                            }));
                          }}
                        />
                        {f.label}
                      </label>
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
