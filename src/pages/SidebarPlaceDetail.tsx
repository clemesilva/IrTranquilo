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
import { AccessibilityConsensusGrid } from '@/components/reviews/AccessibilityConsensusGrid';
import { usePlaces } from '../context/usePlaces';
import type { AccessibilityConsensusMap } from '../lib/reviewAccessibilityConsensus';
import { bandBadgeVariant, bandLabelEs } from '../lib/rating';
import {
  PLACE_CATEGORY_LABEL_ES,
  type PlaceReview,
} from '../types/place';

export function SidebarPlaceDetail() {
  const { placeId } = useParams();
  const id = placeId ? Number(placeId) : NaN;
  const { getPlaceById, reviewsForPlace, accessibilityConsensusForPlace } =
    usePlaces();
  const place = Number.isFinite(id) ? getPlaceById(id) : undefined;

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [consensus, setConsensus] = useState<AccessibilityConsensusMap | null>(
    null,
  );
  const [consensusLoading, setConsensusLoading] = useState(false);

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

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setConsensusLoading(true);
    void accessibilityConsensusForPlace(place.id).then((c) => {
      if (cancelled) return;
      setConsensus(c);
      setConsensusLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [place, accessibilityConsensusForPlace]);

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
            {PLACE_CATEGORY_LABEL_ES[place.category]} · ⭐{' '}
            {place.avgRating.toFixed(1)}
          </CardDescription>
          <p className='text-sm text-foreground'>{place.address}</p>
        </CardHeader>
      </Card>

      <Card size='sm'>
        <CardContent className='pt-4'>
          <AccessibilityConsensusGrid
            consensus={consensus}
            loading={consensusLoading}
            heading='Accesibilidad (consenso de reseñas)'
            headingClassName='text-sm font-semibold text-foreground'
          />
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
