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
  accessibleParking: false,
  accessibleEntrance: false,
  adaptedRestroom: false,
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

    // Subscribe to real-time updates
    const subscription = supabase
      .from('places')
      .on('*', (payload) => {
        console.log('Place updated:', payload);
        fetchPlaces();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlaceCategory | 'all'>('all');
  const [filters, setFilters] = useState<AccessibilityFilters>(defaultFilters);

  const toggleFilter = useCallback((key: keyof AccessibilityFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPlaces.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (q) {
        const hay = `${p.name} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.recommendedOnly && p.band !== 'recommended') return false;
      if (filters.accessibleParking && !p.features.accessibleParking)
        return false;
      if (filters.accessibleEntrance && !p.features.accessibleEntrance)
        return false;
      if (filters.adaptedRestroom && !p.features.adaptedRestroom) return false;
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
      getPlaceById,
      reviewsForPlace,
      isLoading,
    ],
  );

  return (
    <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
  );
}
