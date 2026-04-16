import type { PlaceWithStats } from '../context/placesContext';
import { bandLabelEs } from '../lib/rating';
import { PLACE_CATEGORY_LABEL_ES } from '../types/place';
import { COLORS, getPinColor } from '../styles/colors';

interface PlaceCardProps {
  place: PlaceWithStats;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const pinColor = getPinColor(place.avgRating);

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-bold' style={{ color: COLORS.text }}>{place.name}</h3>
        <p className='text-sm' style={{ color: COLORS.textMuted }}>{PLACE_CATEGORY_LABEL_ES[place.category]}</p>
        <p className='text-xs mt-1' style={{ color: COLORS.textMuted }}>{place.address}</p>
      </div>

      <div className='flex items-center gap-2'>
        <span className='text-2xl font-bold' style={{ color: pinColor }}>
          {place.avgRating.toFixed(1)}
        </span>
        <span className='text-sm' style={{ color: COLORS.textMuted }}>
          {place.reviewCount} reseñas
        </span>
      </div>

      <p className='text-sm' style={{ color: COLORS.textMuted }}>
        {bandLabelEs(place.band)} según valoraciones
      </p>
    </div>
  );
}
