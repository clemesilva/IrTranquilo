export const CATEGORIES = [
  {
    value: 'alimentacion',
    label: 'Alimentación',
    icon: '',
    tooltip: 'Restaurante, Café, Bar, Heladería',
    isPublic: false,
  },
  {
    value: 'comercio',
    label: 'Comercio',
    icon: '',
    tooltip: 'Tienda, Farmacia, Supermercado, Mall',
    isPublic: false,
  },
  {
    value: 'salud',
    label: 'Salud',
    icon: '',
    tooltip: 'Hospital, Clínica, Consultorio, Kinesiología, Dentista',
    isPublic: false,
  },
  {
    value: 'educacion',
    label: 'Educación',
    icon: '',
    tooltip: 'Colegio, Universidad, Capacitación',
    isPublic: false,
  },
  {
    value: 'instituciones',
    label: 'Instituciones públicas',
    icon: '',
    tooltip: 'Municipalidad, Notaría, Servicios del Estado',
    isPublic: true,
  },
  {
    value: 'servicios',
    label: 'Servicios',
    icon: '',
    tooltip: 'Banco, Cajero, Seguros, Correos',
    isPublic: false,
  },
  {
    value: 'espacios_publicos',
    label: 'Espacios públicos',
    icon: '',
    tooltip: 'Parque, Plaza, Playa',
    isPublic: true,
  },
  {
    value: 'cultura',
    label: 'Cultura y ocio',
    icon: '',
    tooltip: 'Museo, Teatro, Cine, Centro cultural',
    isPublic: false,
  },
  {
    value: 'deporte',
    label: 'Deporte',
    icon: '',
    tooltip: 'Gimnasio, Estadio, Spa, Cancha',
    isPublic: false,
  },
  {
    value: 'alojamiento',
    label: 'Alojamiento',
    icon: '',
    tooltip: 'Hotel, Hostal, Apart',
    isPublic: false,
  },
  {
    value: 'inclusion',
    label: 'Inclusión',
    icon: '',
    tooltip: 'Fundación, ONG, Centro de día',
    isPublic: true,
  },
  {
    value: 'otro',
    label: 'Otro',
    icon: '',
    tooltip:
      'Cualquier lugar que no encaje en las categorías anteriores',
    isPublic: false,
  },
] as const

export type PlaceCategory =
  | 'alimentacion'
  | 'comercio'
  | 'salud'
  | 'educacion'
  | 'instituciones'
  | 'servicios'
  | 'espacios_publicos'
  | 'cultura'
  | 'deporte'
  | 'alojamiento'
  | 'inclusion'
  | 'otro'

const CATEGORY_META_BY_VALUE: Record<
  PlaceCategory,
  (typeof CATEGORIES)[number]
> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.value as PlaceCategory] = cat
    return acc
  },
  {} as Record<PlaceCategory, (typeof CATEGORIES)[number]>,
)

export function getCategoryMeta(
  value: string | null | undefined,
): (typeof CATEGORIES)[number] {
  if (!value) return CATEGORY_META_BY_VALUE.otro
  const key = value as PlaceCategory
  return CATEGORY_META_BY_VALUE[key] ?? CATEGORY_META_BY_VALUE.otro
}

export const CATEGORY_LABEL_ES: Record<PlaceCategory, string> =
  Object.fromEntries(
    CATEGORIES.map((c) => [c.value, c.label]),
  ) as Record<PlaceCategory, string>

export const CATEGORY_ICON: Record<PlaceCategory, string> =
  Object.fromEntries(
    CATEGORIES.map((c) => [c.value, c.icon]),
  ) as Record<PlaceCategory, string>

/** Alineado al esquema SQL `places` (id bigint en DB; aquí number). */
export interface Place {
  id: number
  name: string
  category: PlaceCategory
  address: string
  latitude: number
  longitude: number
  openingHours?: string[] | null
  photoUrl?: string | null
  phone?: string | null
  website?: string | null
  googleRating?: number | null
  googleRatingsTotal?: number | null
  googlePhotoUrl?: string | null
  wheelchairAccessible?: boolean | null
  priceLevel?: number | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** Alineado al esquema SQL `reviews`. */
export interface PlaceReview {
  id: number
  placeId: number
  rating: number
  comment: string | null
  createdAt?: string | null
  authorId?: string | null
  authorName?: string | null
  photoUrls?: string[] | null
  videoUrl?: string | null
  helpfulCount?: number | null
}

export type RatingBand = 'recommended' | 'acceptable' | 'not_recommended'
