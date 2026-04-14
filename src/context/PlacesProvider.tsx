import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import type { PlaceCategory, PlaceExtended } from '../types/place';
import {
  PlacesContext,
  type AccessibilityFilters,
  type PlaceWithStats,
} from './placesContext';

const defaultFilters: AccessibilityFilters = {
  recommendedOnly: false,
  minRating: null,
  // Llegada
  parking_available: false,
  parking_accessible: false,
  parking_near_entrance: false,
  signage_clear: false,
  // Entrada
  step_free_access: false,
  ramp_available: false,
  elevator_available: false,
  entrance_width_ok: false,
  // Interior
  interior_spacious: false,
  wheelchair_table_access: false,
  accessible_bathroom: false,
  circulation_clear: false,
};

function mapPlaceFromDB(place: any): PlaceExtended {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    features: {
      accessibleParking: place.accessible_parking,
      accessibleEntrance: place.accessible_entrance,
      adaptedRestroom: place.adapted_restroom,
    },
    arrival: {
      accessibleParking: place.arrival_accessible_parking || '',
      proximity: place.arrival_proximity || '',
      availability: place.arrival_availability || '',
    },
    entrance: {
      noSteps: place.entrance_no_steps,
      ramp: place.entrance_ramp,
      accessNote: place.entrance_access_note || '',
    },
    interior: {
      space: place.interior_space || '',
      restroom: place.interior_restroom || '',
      elevator: place.interior_elevator || '',
    },
  };
}

function mapPlaceWithStats(place: any): PlaceWithStats {
  const mapped = mapPlaceFromDB(place);
  return {
    ...mapped,
    avgRating: place.avg_rating || 0,
    band: place.rating_band || 'not_recommended',
    reviewCount: place.review_count || 0,
  };
}

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [allPlaces, setAllPlaces] = useState<PlaceWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch places from Supabase
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map(mapPlaceWithStats);
        setAllPlaces(mapped);
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlaceCategory | 'all'>('all');
  const [filters, setFilters] = useState<AccessibilityFilters>(defaultFilters);

  const toggleFilter = useCallback((key: keyof AccessibilityFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setFilterValue = useCallback(
    (key: keyof AccessibilityFilters, value: boolean | number | null) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allPlaces.filter((p) => {
      // Filtro 1: Categoría
      if (category !== 'all' && p.category !== category) return false;

      // Filtro 2: Búsqueda por texto
      if (q) {
        const hay = `${p.name} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Filtro 3: Solo recomendados
      if (filters.recommendedOnly && p.band !== 'recommended') return false;

      // Filtro 4: Rating mínimo (lógica AND)
      if (filters.minRating !== null && p.avgRating < filters.minRating) {
        return false;
      }

      // === LÓGICA AND PARA ACCESIBILIDAD ===
      // Todos los filtros seleccionados deben cumplirse

      // Llegada (Parking)
      if (filters.parking_available && !p.features.accessibleParking) return false;
      if (filters.parking_accessible && !p.features.accessibleParking) return false;
      if (filters.parking_near_entrance && p.arrival.proximity !== 'near') return false;
      if (filters.signage_clear && p.arrival.accessibleParking !== 'good_signage') return false;

      // Entrada
      if (filters.step_free_access && !p.entrance.noSteps) return false;
      if (filters.ramp_available && !p.entrance.ramp) return false;
      if (filters.elevator_available && !p.interior.elevator?.includes('yes')) return false;
      if (filters.entrance_width_ok && p.entrance.accessNote !== 'good_access') return false;

      // Interior
      if (filters.interior_spacious && p.interior.space !== 'spacious') return false;
      if (filters.wheelchair_table_access && p.interior.space !== 'spacious') return false;
      if (filters.accessible_bathroom && !p.features.adaptedRestroom) return false;
      if (filters.circulation_clear && p.interior.space !== 'spacious') return false;

      return true;
    });
  }, [allPlaces, search, category, filters]);

  const getPlaceById = useCallback(
    (id: number) => allPlaces.find((p) => p.id === id),
    [allPlaces],
  );

  const reviewsForPlace = useCallback(async (placeId: number) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, author_id')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      placeId,
      rating: r.rating,
      comment: r.comment,
    }));
  }, []);

  const value = useMemo(
    () => ({
      allPlaces,
      filteredPlaces,
      search,
      setSearch,
      category,
      setCategory,
      filters,
      setFilters,
      toggleFilter,
      setFilterValue,
      resetFilters,
      getPlaceById,
      reviewsForPlace,
      isLoading,
    }),
    [
      allPlaces,
      filteredPlaces,
      search,
      category,
      filters,
      toggleFilter,
      setFilterValue,
      resetFilters,
      getPlaceById,
      reviewsForPlace,
      isLoading,
    ],
  );

  return (
    <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
  );
}
