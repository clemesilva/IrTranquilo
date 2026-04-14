import { createContext } from 'react';
import type {
  PlaceCategory,
  PlaceExtended,
  PlaceReview,
  RatingBand,
} from '../types/place';

export interface AccessibilityFilters {
  recommendedOnly: boolean;
  accessibleParking: boolean;
  accessibleEntrance: boolean;
  adaptedRestroom: boolean;
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
  getPlaceById: (id: number) => PlaceWithStats | undefined;
  reviewsForPlace: (placeId: number) => Promise<PlaceReview[]>;
  isLoading: boolean;
}

export const PlacesContext = createContext<PlacesContextValue | null>(null);
