import { createContext } from 'react';
import type {
  Place,
  PlaceCategory,
  PlaceReview,
  RatingBand,
} from '../types/place';
import type { AccessibilityConsensusMap } from '../lib/reviewAccessibilityConsensus';
import type {
  AccessibilityReviewValues,
  MyReviewWithAccessibility,
  PlaceReviewMediaInput,
} from '../types/reviewAccessibility';

export interface AccessibilityFilters {
  // 1. Recomendado
  recommendedOnly: boolean;

  // 1b. Filtro por banda de rating
  ratingBand: RatingBand | 'all';

  // 2. Rating mínimo
  minRating: number | null;

  // 3. Llegada
  parking_accessible: boolean;
  nearby_parking: boolean;
  service_dogs_allowed: boolean;

  // 4. Acceso
  ramp_available: boolean;
  non_slip_surface: boolean;
  accessible_route: boolean;

  // 5. Desplazamiento vertical
  elevator_available: boolean;
  mechanical_stairs: boolean;

  // 6. Interior
  wide_entrance: boolean;
  circulation_clear: boolean;
  lowered_counter: boolean;
  accessible_bathroom: boolean;
  dining_table_accessible: boolean;
}

/** Toggles de accesibilidad en filtros (consenso ≥ 60 % sobre filas `reviews` con checklist). */
export const ACCESSIBILITY_FILTER_TOGGLE_KEYS = [
  'parking_accessible',
  'nearby_parking',
  'service_dogs_allowed',
  'ramp_available',
  'non_slip_surface',
  'accessible_route',
  'elevator_available',
  'mechanical_stairs',
  'wide_entrance',
  'circulation_clear',
  'lowered_counter',
  'accessible_bathroom',
  'dining_table_accessible',
] as const;

export type AccessibilityFilterToggleKey =
  (typeof ACCESSIBILITY_FILTER_TOGGLE_KEYS)[number];

export interface PlaceWithStats extends Place {
  avgRating: number;
  band: RatingBand;
  reviewCount: number;
  /** Cantidad de reportes temporales activos asociados al lugar. */
  activeReportsCount?: number;
}

export interface PlacesContextValue {
  allPlaces: PlaceWithStats[];
  filteredPlaces: PlaceWithStats[];
  search: string;
  setSearch: (v: string) => void;
  category: PlaceCategory | 'all';
  setCategory: (v: PlaceCategory | 'all') => void;
  filters: AccessibilityFilters;
  setFilters: (v: AccessibilityFilters) => void;
  toggleFilter: (key: keyof AccessibilityFilters) => void;
  setFilterValue: (
    key: keyof AccessibilityFilters,
    value: boolean | number | string | null,
  ) => void;
  resetFilters: () => void;
  getPlaceById: (id: number) => PlaceWithStats | undefined;
  reviewsForPlace: (placeId: number) => Promise<PlaceReview[]>;
  myReviewWithAccessibility: (
    placeId: number,
  ) => Promise<MyReviewWithAccessibility | null>;
  submitPlaceReview: (
    placeId: number,
    rating: number,
    comment: string | null,
    accessibility: AccessibilityReviewValues,
    media: PlaceReviewMediaInput,
  ) => Promise<void>;
  accessibilityConsensusForPlace: (
    placeId: number,
  ) => Promise<AccessibilityConsensusMap>;
  refreshPlaces: () => Promise<void>;
  isLoading: boolean;
}

export const PlacesContext = createContext<PlacesContextValue | null>(null);
