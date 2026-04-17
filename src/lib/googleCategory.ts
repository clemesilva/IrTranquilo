import type { PlaceCategory } from '@/types/place'

const GOOGLE_CATEGORY_MAP: Record<string, PlaceCategory> = {
  restaurant: 'alimentacion',
  food: 'alimentacion',
  cafe: 'alimentacion',
  bar: 'alimentacion',
  hospital: 'salud',
  doctor: 'salud',
  pharmacy: 'comercio',
  health: 'salud',
  bank: 'servicios',
  shopping_mall: 'comercio',
  store: 'comercio',
  supermarket: 'comercio',
  school: 'educacion',
  university: 'educacion',
  park: 'espacios_publicos',
  museum: 'cultura',
  stadium: 'deporte',
  gym: 'deporte',
  spa: 'deporte',
  lodging: 'alojamiento',
  city_hall: 'instituciones',
  local_gevernment_office: 'instituciones',
  local_government_office: 'instituciones',
}

export function mapGoogleTypeToCategory(rawTypes: string[] = []): PlaceCategory {
  for (const t of rawTypes) {
    const mapped = GOOGLE_CATEGORY_MAP[t]
    if (mapped) return mapped
  }
  return 'otro'
}

