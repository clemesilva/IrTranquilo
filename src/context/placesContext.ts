import { createContext } from 'react';
import type {
  PlaceCategory,
  PlaceExtended,
  PlaceReview,
  RatingBand,
} from '../types/place';

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

export interface PlaceWithStats extends PlaceExtended {
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
  setFilterValue: (key: keyof AccessibilityFilters, value: boolean | number | null) => void;
  resetFilters: () => void;
  getPlaceById: (id: number) => PlaceWithStats | undefined;
  reviewsForPlace: (placeId: number) => Promise<PlaceReview[]>;
  createReview: (placeId: number, rating: number, comment?: string | null) => Promise<void>;
  refreshPlaces: () => Promise<void>;
  isLoading: boolean;
}

export const PlacesContext = createContext<PlacesContextValue | null>(null);
