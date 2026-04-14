export const PLACE_CATEGORIES = [
  'restaurant',
  'cafe',
  'mall',
  'park',
  'clinic',
  'other',
] as const

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

/** Alineado al esquema SQL `places` (id bigint en DB; aquí number para el MVP mock). */
export interface Place {
  id: number
  name: string
  category: PlaceCategory
  address: string
  latitude: number
  longitude: number
}

/** Alineado al esquema SQL `place_reviews`. */
export interface PlaceReview {
  id: number
  placeId: number
  rating: number
  comment: string | null
}

/** Campos extra solo en mock / futura migración, para filtros y ficha detalle. */
export interface PlaceAccessibilityFlags {
  accessibleParking: boolean
  accessibleEntrance: boolean
  adaptedRestroom: boolean
}

export interface PlaceArrivalDetail {
  accessibleParking: string
  proximity: string
  availability: string
}

export interface PlaceEntranceDetail {
  noSteps: boolean
  ramp: boolean
  accessNote: string
}

export interface PlaceInteriorDetail {
  space: string
  restroom: string
  elevator: string
}

export interface PlaceExtended extends Place {
  features: PlaceAccessibilityFlags
  arrival: PlaceArrivalDetail
  entrance: PlaceEntranceDetail
  interior: PlaceInteriorDetail
}

export type RatingBand = 'recommended' | 'acceptable' | 'not_recommended'
