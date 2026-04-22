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
  signage_clear: boolean;
  ramp_available: boolean;
  mechanical_stairs: boolean;

  // 4. Entrada
  elevator_available: boolean;
  wide_entrance: boolean;

  // 5. Interior
  accessible_bathroom: boolean;
  circulation_clear: boolean;
  lowered_counter: boolean;
}

/** Toggles de accesibilidad en filtros (consenso ≥ 60 % sobre filas `reviews` con checklist). */
export const ACCESSIBILITY_FILTER_TOGGLE_KEYS = [
  'parking_accessible',
  'nearby_parking',
  'signage_clear',
  'ramp_available',
  'mechanical_stairs',
  'elevator_available',
  'wide_entrance',
  'accessible_bathroom',
  'circulation_clear',
  'lowered_counter',
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
