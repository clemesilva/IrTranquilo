import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AccessibilityAspectRow } from '@/components/map/AccessibilityAspectRow';
import { usePlaces } from '../context/usePlaces';
import { bandBadgeVariant, bandLabelEs } from '../lib/rating';
import {
  PLACE_CATEGORY_LABEL_ES,
  type PlaceReview,
} from '../types/place';

export function SidebarPlaceDetail() {
  const { placeId } = useParams();
  const id = placeId ? Number(placeId) : NaN;
  const { getPlaceById, reviewsForPlace } = usePlaces();
  const place = Number.isFinite(id) ? getPlaceById(id) : undefined;

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    if (!place) return;

    const loadReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const data = await reviewsForPlace(place.id);
        setReviews(data);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    loadReviews();
  }, [place, reviewsForPlace]);

  if (!place) {
    return (
      <div className='flex flex-col gap-4'>
        <Button variant='ghost' className='w-fit px-0' asChild>
          <Link to='/'>← Volver</Link>
        </Button>
        <p className='text-sm text-muted-foreground'>
          No se encontró el lugar.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <Button variant='ghost' className='w-fit px-0' asChild>
        <Link to='/'>← Volver al listado</Link>
      </Button>

      <Card size='sm'>
        <CardHeader>
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <CardTitle className='text-base'>{place.name}</CardTitle>
            <Badge variant={bandBadgeVariant(place.band)}>
              {bandLabelEs(place.band)}
            </Badge>
          </div>
          <CardDescription>
            {PLACE_CATEGORY_LABEL_ES[place.category]} · ⭐ {place.avgRating.toFixed(1)}
          </CardDescription>
          <p className='text-sm text-foreground'>{place.address}</p>
        </CardHeader>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Accesibilidad (sí y no)</CardTitle>
          <CardDescription className='text-xs'>
            Lo verde es favorable según el registro; lo rojizo indica ausencia o
            barrera declarada.
          </CardDescription>
        </CardHeader>
        <CardContent className='text-sm'>
          <ul className='m-0 list-none space-y-1.5 p-0'>
            <AccessibilityAspectRow ok={place.features.accessibleParking}>
              {place.features.accessibleParking
                ? 'Estacionamiento accesible'
                : 'Sin estacionamiento accesible registrado'}
            </AccessibilityAspectRow>
            <AccessibilityAspectRow ok={place.features.accessibleEntrance}>
              {place.features.accessibleEntrance
                ? 'Entrada accesible'
                : 'Entrada no marcada como accesible'}
            </AccessibilityAspectRow>
            <AccessibilityAspectRow ok={place.features.adaptedRestroom}>
              {place.features.adaptedRestroom
                ? 'Baño adaptado'
                : 'Sin baño adaptado registrado'}
            </AccessibilityAspectRow>
            <AccessibilityAspectRow ok={place.entrance.noSteps}>
              {place.entrance.noSteps
                ? 'Entrada sin escalones'
                : 'Escalones o desnivel en la entrada'}
            </AccessibilityAspectRow>
            <AccessibilityAspectRow ok={place.entrance.ramp}>
              {place.entrance.ramp
                ? 'Rampa en la entrada'
                : 'Sin rampa en la entrada'}
            </AccessibilityAspectRow>
          </ul>
          {place.entrance.accessNote?.trim() ? (
            <p className='mt-3 rounded-md border border-amber-200/80 bg-amber-50/70 p-2 text-xs leading-relaxed text-amber-950'>
              <span className='font-semibold'>Observaciones: </span>
              {place.entrance.accessNote.trim()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Llegada (detalle)</CardTitle>
          <CardDescription className='text-xs'>
            Textos de la comunidad; pueden incluir advertencias.
          </CardDescription>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <ul className='m-0 list-disc space-y-1 pl-4'>
            <li>
              Estacionamiento:{' '}
              {place.arrival.accessibleParking || '—'}
            </li>
            <li>Cercanía: {place.arrival.proximity || '—'}</li>
            <li>Disponibilidad: {place.arrival.availability || '—'}</li>
          </ul>
        </CardContent>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Interior (detalle)</CardTitle>
          <CardDescription className='text-xs'>
            Puede describir limitaciones (pasillos estrechos, ascensor pequeño,
            etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <ul className='m-0 list-disc space-y-1 pl-4'>
            <li>Espacio: {place.interior.space || '—'}</li>
            <li>Baño: {place.interior.restroom || '—'}</li>
            <li>Ascensor: {place.interior.elevator || '—'}</li>
          </ul>
        </CardContent>
      </Card>

      <div>
        <h2 className='mb-2 text-sm font-medium'>Comentarios</h2>
        {isLoadingReviews ? (
          <p className='text-sm text-muted-foreground'>Cargando...</p>
        ) : reviews.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Sin reseñas aún.</p>
        ) : (
          <div className='flex flex-col gap-2'>
            {reviews.map((r, i) => (
              <div key={r.id}>
                {i > 0 ? <Separator className='my-2' /> : null}
                <Card size='sm' className='py-3'>
                  <CardContent className='text-sm'>
                    <div className='font-medium'>⭐ {r.rating}</div>
                    {r.comment ? (
                      <p className='mt-1 text-muted-foreground'>{r.comment}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
