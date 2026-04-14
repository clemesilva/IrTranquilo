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
import { usePlaces } from '../context/usePlaces';
import { bandBadgeVariant, bandLabelEs } from '../lib/rating';
import type { PlaceCategory, PlaceReview } from '../types/place';

const categoryLabel: Record<PlaceCategory, string> = {
  restaurant: 'Restaurante',
  cafe: 'Café',
  mall: 'Centro comercial',
  park: 'Parque',
  clinic: 'Clínica',
  other: 'Otro',
};

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
            {categoryLabel[place.category]} · ⭐ {place.avgRating.toFixed(1)}
          </CardDescription>
          <p className='text-sm text-foreground'>{place.address}</p>
        </CardHeader>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Llegada</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <ul className='m-0 list-disc space-y-1 pl-4'>
            <li>Estacionamiento: {place.arrival.accessibleParking}</li>
            <li>Cercanía: {place.arrival.proximity}</li>
            <li>Disponibilidad: {place.arrival.availability}</li>
          </ul>
        </CardContent>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Entrada</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <ul className='m-0 list-disc space-y-1 pl-4'>
            <li>Sin escalones: {place.entrance.noSteps ? 'Sí' : 'No'}</li>
            <li>Rampa: {place.entrance.ramp ? 'Sí' : 'No'}</li>
            <li>Acceso: {place.entrance.accessNote}</li>
          </ul>
        </CardContent>
      </Card>

      <Card size='sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Interior</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <ul className='m-0 list-disc space-y-1 pl-4'>
            <li>Espacio: {place.interior.space}</li>
            <li>Baño: {place.interior.restroom}</li>
            <li>Ascensor: {place.interior.elevator}</li>
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
