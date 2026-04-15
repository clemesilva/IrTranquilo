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
  parking_accessible: false,
  parking_near_entrance: false,
  signage_clear: false,
  // Entrada
  step_free_access: false,
  ramp_available: false,
  elevator_available: false,
  entrance_width_ok: false,
  // Interior
  accessible_bathroom: false,
  circulation_clear: false,
};

type DbPlaceRow = {
  id: number
  name: string
  category: PlaceCategory
  address: string
  latitude: number | string
  longitude: number | string
  opening_hours: string[] | null
  accessible_parking: boolean | null
  accessible_entrance: boolean | null
  adapted_restroom: boolean | null
  arrival_accessible_parking: string | null
  arrival_proximity: string | null
  arrival_availability: string | null
  entrance_no_steps: boolean | null
  entrance_ramp: boolean | null
  entrance_access_note: string | null
  interior_space: string | null
  interior_restroom: string | null
  interior_elevator: string | null
  avg_rating: number | null
  rating_band: PlaceWithStats['band'] | null
  review_count: number | null
}

type DbReviewRow = {
  id: number
  rating: number
  comment: string | null
  created_at: string | null
  author_id: string | null
  users?: { display_name: string | null } | { display_name: string | null }[] | null
}

function mapPlaceFromDB(place: DbPlaceRow): PlaceExtended {
  const lat = typeof place.latitude === 'string' ? Number(place.latitude) : place.latitude
  const lng = typeof place.longitude === 'string' ? Number(place.longitude) : place.longitude

  return {
    id: place.id,
    name: place.name,
    category: place.category,
    address: place.address,
    latitude: lat,
    longitude: lng,
    openingHours: place.opening_hours ?? null,
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
      accessNote: place.entrance_access_note,
    },
    interior: {
      space: place.interior_space,
      restroom: place.interior_restroom,
      elevator: place.interior_elevator,
    },
  };
}

function mapPlaceWithStats(place: DbPlaceRow): PlaceWithStats {
  const mapped = mapPlaceFromDB(place);
  return {
    ...mapped,
    avgRating: place.avg_rating ?? 0,
    band: place.rating_band ?? 'not_recommended',
    reviewCount: place.review_count ?? 0,
  };
}

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [allPlaces, setAllPlaces] = useState<PlaceWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlaces = useCallback(async () => {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = ((data || []) as DbPlaceRow[]).map(mapPlaceWithStats);
    setAllPlaces(mapped);
  }, []);

  // Fetch places from Supabase
  useEffect(() => {
    const run = async () => {
      try {
        await refreshPlaces();
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [refreshPlaces]);

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
      if (filters.parking_accessible && p.features.accessibleParking !== true) return false;
      if (filters.parking_near_entrance && p.arrival.proximity !== 'near') return false;
      if (filters.signage_clear && p.arrival.accessibleParking !== 'good_signage') return false;

      // Entrada
      if (filters.step_free_access && p.entrance.noSteps !== true) return false;
      if (filters.ramp_available && p.entrance.ramp !== true) return false;
      if (filters.elevator_available && !p.interior.elevator?.includes('yes')) return false;
      if (filters.entrance_width_ok && p.entrance.accessNote !== 'good_access') return false;

      // Interior
      if (filters.accessible_bathroom && p.features.adaptedRestroom !== true) return false;
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
      .select('id, rating, comment, created_at, author_id, users(display_name)')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    return ((data || []) as DbReviewRow[]).map((r) => ({
      id: r.id,
      placeId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      authorId: r.author_id,
      authorName: Array.isArray(r.users)
        ? r.users[0]?.display_name ?? null
        : r.users?.display_name ?? null,
    }));
  }, []);

  const createReview = useCallback(
    async (placeId: number, rating: number, comment?: string | null) => {
      const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
      const cleanComment = comment?.trim() ? comment.trim() : null;

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('Debes iniciar sesión para dejar una reseña.');

      const { error } = await supabase.from('reviews').insert({
        place_id: placeId,
        author_id: user.id,
        rating: cleanRating,
        comment: cleanComment,
      });

      if (error) throw error;

      // Actualiza stats/orden y cualquier trigger/denormalización.
      await refreshPlaces();
    },
    [refreshPlaces],
  );

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
      createReview,
      refreshPlaces,
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
      createReview,
      refreshPlaces,
      isLoading,
    ],
  );

  return (
    <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
  );
}
