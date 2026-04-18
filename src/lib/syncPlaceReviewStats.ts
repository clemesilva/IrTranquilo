import { averageRating, ratingBand } from '@/lib/rating';
import { supabase } from '@/services/supabase';

/** Reseñas que cuentan para promedio y conteo en `places` (excluye fila metadatos Google). */
function isUserRatingRow(r: {
  rating: number | null | undefined;
  source?: string | null;
}): boolean {
  if (r.rating == null) return false;
  const src = (r.source ?? 'user').toLowerCase();
  return src !== 'google';
}

/** Recalcula promedio, conteo y banda en `places` a partir de `reviews`. */
export async function syncPlaceReviewStats(placeId: number) {
  const { data: allReviews, error } = await supabase
    .from('reviews')
    .select('rating, source')
    .eq('place_id', placeId);

  if (error) throw error;

  const ratings = (allReviews ?? [])
    .filter(isUserRatingRow)
    .map((r) => Number(r.rating));

  const cnt = ratings.length;
  const avg = cnt === 0 ? 0 : averageRating(ratings);
  const band = ratingBand(avg);

  const { error: upErr } = await supabase
    .from('places')
    .update({
      avg_rating: avg,
      review_count: cnt,
      rating_band: band,
    })
    .eq('id', placeId);

  if (upErr) throw upErr;
}
