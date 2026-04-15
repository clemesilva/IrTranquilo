export const PLACE_CATEGORIES = [
  // Gastronomía y retail frecuente
  'restaurant',
  'cafe',
  'gastronomy',
  'ice_cream',
  'winery',
  'mall',
  'store',
  'apparel',
  'home_goods',
  'bookstore',
  'pharmacy',
  // Espacios públicos y grandes
  'park',
  'stadium',
  'museum',
  'convention_center',
  // Salud y bienestar
  'clinic',
  'health_services',
  'medical_office',
  'day_center',
  'therapeutic_school',
  'integration_center',
  'job_training',
  'education',
  'foundation',
  // Servicios y otros
  'bank',
  'airline',
  'hotel',
  'travel_agency',
  'energy',
  'automotive',
  'billing',
  'other',
] as const

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

/** Etiquetas en español (UI y filtros). */
export const PLACE_CATEGORY_LABEL_ES = {
  restaurant: 'Restaurante',
  cafe: 'Café',
  gastronomy: 'Gastronomía',
  ice_cream: 'Heladería',
  winery: 'Bodega',
  mall: 'Centro comercial',
  store: 'Tienda',
  apparel: 'Indumentaria',
  home_goods: 'Hogar',
  bookstore: 'Librería',
  pharmacy: 'Farmacia',
  park: 'Parque',
  stadium: 'Estadio',
  museum: 'Museo',
  convention_center: 'Centro de convenciones',
  clinic: 'Clínica',
  health_services: 'Prestaciones de salud',
  medical_office: 'Consultorios',
  day_center: 'Centro de día',
  therapeutic_school: 'Centro educativo terapéutico',
  integration_center: 'Centro de integración',
  job_training: 'Formación laboral',
  education: 'Educación',
  foundation: 'Fundación',
  bank: 'Banco',
  airline: 'Aerolínea',
  hotel: 'Hotelería',
  travel_agency: 'Agencia de viajes',
  energy: 'Energía',
  automotive: 'Automotriz',
  billing: 'Cobranza',
  other: 'Otro',
} as const satisfies Record<PlaceCategory, string>

/** Alineado al esquema SQL `places` (id bigint en DB; aquí number para el MVP mock). */
export interface Place {
  id: number
  name: string
  category: PlaceCategory
  address: string
  latitude: number
  longitude: number
  openingHours?: string[] | null
}

/** Alineado al esquema SQL `place_reviews`. */
export interface PlaceReview {
  id: number
  placeId: number
  rating: number
  comment: string | null
  createdAt?: string | null
  authorId?: string | null
  authorName?: string | null
}

/** Campos extra solo en mock / futura migración, para filtros y ficha detalle. */
export interface PlaceAccessibilityFlags {
  accessibleParking: boolean | null
  accessibleEntrance: boolean | null
  adaptedRestroom: boolean | null
}

export interface PlaceArrivalDetail {
  accessibleParking: string
  proximity: string
  availability: string
}

export interface PlaceEntranceDetail {
  noSteps: boolean | null
  ramp: boolean | null
  accessNote: string | null
}

export interface PlaceInteriorDetail {
  space: string | null
  restroom: string | null
  elevator: string | null
}

export interface PlaceExtended extends Place {
  features: PlaceAccessibilityFlags
  arrival: PlaceArrivalDetail
  entrance: PlaceEntranceDetail
  interior: PlaceInteriorDetail
}

export type RatingBand = 'recommended' | 'acceptable' | 'not_recommended'
