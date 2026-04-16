import { averageRating, ratingBand } from '@/lib/rating';
import { supabase } from '@/services/supabase';

/** Recalcula promedio, conteo y banda en `places` a partir de `reviews`. */
export async function syncPlaceReviewStats(placeId: number) {
  const { data: allReviews, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('place_id', placeId);

  if (error) throw error;

  const ratings = (allReviews ?? []).map((r) => Number(r.rating));
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
