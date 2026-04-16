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
} from '../types/reviewAccessibility';

export interface AccessibilityFilters {
  // 1. Recomendado
  recommendedOnly: boolean;

  // 2. Rating mínimo
  minRating: number | null;

  // 3. Llegada (Parking)
  parking_accessible: boolean;
  parking_near_entrance: boolean;
  signage_clear: boolean;

  // 4. Entrada
  step_free_access: boolean;
  ramp_available: boolean;
  elevator_available: boolean;
  entrance_width_ok: boolean;

  // 5. Interior
  accessible_bathroom: boolean;
  circulation_clear: boolean;
}

/** Toggles de accesibilidad en filtros (consenso ≥ 60 % en `place_accessibility_reviews`). */
export const ACCESSIBILITY_FILTER_TOGGLE_KEYS = [
  'parking_accessible',
  'parking_near_entrance',
  'signage_clear',
  'step_free_access',
  'ramp_available',
  'elevator_available',
  'entrance_width_ok',
  'accessible_bathroom',
  'circulation_clear',
] as const;

export type AccessibilityFilterToggleKey =
  (typeof ACCESSIBILITY_FILTER_TOGGLE_KEYS)[number];

export interface PlaceWithStats extends Place {
  avgRating: number;
  band: RatingBand;
  reviewCount: number;
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
    value: boolean | number | null,
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
  ) => Promise<void>;
  accessibilityConsensusForPlace: (
    placeId: number,
  ) => Promise<AccessibilityConsensusMap>;
  refreshPlaces: () => Promise<void>;
  isLoading: boolean;
}

export const PlacesContext = createContext<PlacesContextValue | null>(null);
