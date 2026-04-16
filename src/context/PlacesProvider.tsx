import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import {
  computeAccessibilityConsensus,
  rowToAccessibilityValues,
  type AccessibilityConsensusMap,
  type PlaceAccessibilityReviewRow,
  consensusFieldStrictYes,
} from '../lib/reviewAccessibilityConsensus';
import { syncPlaceReviewStats } from '../lib/syncPlaceReviewStats';
import type { Place, PlaceCategory } from '../types/place';
import {
  ACCESSIBILITY_REVIEW_KEYS,
  createEmptyAccessibilityValues,
  type AccessibilityReviewValues,
} from '../types/reviewAccessibility';
import {
  PlacesContext,
  ACCESSIBILITY_FILTER_TOGGLE_KEYS,
  type AccessibilityFilters,
  type PlaceWithStats,
} from './placesContext';

const defaultFilters: AccessibilityFilters = {
  recommendedOnly: false,
  minRating: null,
  parking_accessible: false,
  parking_near_entrance: false,
  signage_clear: false,
  step_free_access: false,
  ramp_available: false,
  elevator_available: false,
  entrance_width_ok: false,
  accessible_bathroom: false,
  circulation_clear: false,
};

type DbPlaceRow = {
  id: number;
  name: string;
  category: PlaceCategory;
  address: string;
  latitude: number | string;
  longitude: number | string;
  opening_hours: string[] | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  avg_rating: number | null;
  rating_band: PlaceWithStats['band'] | null;
  review_count: number | null;
};

type DbReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string | null;
  author_id: string | null;
  users?:
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
};

function mapPlaceFromDB(place: DbPlaceRow): Place {
  const lat =
    typeof place.latitude === 'string'
      ? Number(place.latitude)
      : place.latitude;
  const lng =
    typeof place.longitude === 'string'
      ? Number(place.longitude)
      : place.longitude;

  return {
    id: place.id,
    name: place.name,
    category: place.category,
    address: place.address,
    latitude: lat,
    longitude: lng,
    openingHours: place.opening_hours ?? null,
    photoUrl: place.photo_url ?? null,
    createdBy: place.created_by ?? null,
    createdAt: place.created_at ?? null,
    updatedAt: place.updated_at ?? null,
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

function buildConsensusByPlaceId(
  rows: PlaceAccessibilityReviewRow[],
): Record<number, AccessibilityConsensusMap> {
  const byPlace: Record<number, PlaceAccessibilityReviewRow[]> = {};
  for (const row of rows) {
    const pid = row.place_id;
    if (pid == null || !Number.isFinite(pid)) continue;
    if (!byPlace[pid]) byPlace[pid] = [];
    byPlace[pid].push(row);
  }
  const out: Record<number, AccessibilityConsensusMap> = {};
  for (const pidStr of Object.keys(byPlace)) {
    const pid = Number(pidStr);
    out[pid] = computeAccessibilityConsensus(byPlace[pid]);
  }
  return out;
}

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [allPlaces, setAllPlaces] = useState<PlaceWithStats[]>([]);
  const [consensusByPlaceId, setConsensusByPlaceId] = useState<
    Record<number, AccessibilityConsensusMap>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlaces = useCallback(async () => {
    const [placesRes, accRes] = await Promise.all([
      supabase
        .from('places')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('place_accessibility_reviews').select('*'),
    ]);

    if (placesRes.error) throw placesRes.error;
    if (accRes.error) throw accRes.error;

    const mapped = ((placesRes.data || []) as DbPlaceRow[]).map(
      mapPlaceWithStats,
    );
    const consensusMap = buildConsensusByPlaceId(
      (accRes.data || []) as PlaceAccessibilityReviewRow[],
    );
    for (const p of mapped) {
      if (consensusMap[p.id] == null) {
        consensusMap[p.id] = computeAccessibilityConsensus([]);
      }
    }

    setConsensusByPlaceId(consensusMap);
    setAllPlaces(mapped);
  }, []);

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
      if (category !== 'all' && p.category !== category) return false;

      if (q) {
        const hay = `${p.name} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.recommendedOnly && p.band !== 'recommended') return false;

      if (filters.minRating !== null && p.avgRating < filters.minRating) {
        return false;
      }

      const consensus =
        consensusByPlaceId[p.id] ?? computeAccessibilityConsensus([]);

      for (const key of ACCESSIBILITY_FILTER_TOGGLE_KEYS) {
        if (!filters[key]) continue;
        const field = consensus[key];
        if (!consensusFieldStrictYes(field)) return false;
      }

      return true;
    });
  }, [allPlaces, search, category, filters, consensusByPlaceId]);

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
        ? (r.users[0]?.display_name ?? null)
        : (r.users?.display_name ?? null),
    }));
  }, []);

  const myReviewWithAccessibility = useCallback(async (placeId: number) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;

    const { data: rev, error: revErr } = await supabase
      .from('reviews')
      .select('id, rating, comment')
      .eq('place_id', placeId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (revErr) {
      console.error('Error loading my review:', revErr);
      return null;
    }
    if (!rev) return null;

    const { data: acc, error: accErr } = await supabase
      .from('place_accessibility_reviews')
      .select('*')
      .eq('review_id', rev.id)
      .maybeSingle();

    if (accErr) {
      console.error('Error loading accessibility review:', accErr);
    }

    const accessibility = acc
      ? rowToAccessibilityValues(acc as Record<string, unknown>)
      : createEmptyAccessibilityValues();

    return {
      id: rev.id,
      rating: rev.rating,
      comment: rev.comment,
      accessibility,
    };
  }, []);

  const accessibilityConsensusForPlace = useCallback(
    async (placeId: number) => {
      const { data, error } = await supabase
        .from('place_accessibility_reviews')
        .select('*')
        .eq('place_id', placeId);

      if (error) {
        console.error('Error loading accessibility consensus:', error);
        return computeAccessibilityConsensus([]);
      }

      return computeAccessibilityConsensus(
        (data || []) as PlaceAccessibilityReviewRow[],
      );
    },
    [],
  );

  const submitPlaceReview = useCallback(
    async (
      placeId: number,
      rating: number,
      comment: string | null,
      accessibility: AccessibilityReviewValues,
    ) => {
      const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
      const cleanComment = comment?.trim() ? comment.trim() : null;

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('Debes iniciar sesión para dejar una reseña.');

      const { data: existing, error: findErr } = await supabase
        .from('reviews')
        .select('id')
        .eq('place_id', placeId)
        .eq('author_id', user.id)
        .maybeSingle();

      if (findErr) throw findErr;

      let reviewId: number;

      if (existing?.id != null) {
        reviewId = existing.id;
        const { error: upErr } = await supabase
          .from('reviews')
          .update({
            rating: cleanRating,
            comment: cleanComment,
          })
          .eq('id', reviewId);
        if (upErr) throw upErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('reviews')
          .insert({
            place_id: placeId,
            author_id: user.id,
            rating: cleanRating,
            comment: cleanComment,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        if (!inserted?.id) throw new Error('No se pudo crear la reseña.');
        reviewId = inserted.id;
      }

      const { data: accExisting } = await supabase
        .from('place_accessibility_reviews')
        .select('id')
        .eq('review_id', reviewId)
        .maybeSingle();

      if (accExisting?.id != null) {
        const updatePayload: Record<string, boolean> = {};
        for (const k of ACCESSIBILITY_REVIEW_KEYS) {
          updatePayload[k] = accessibility[k];
        }
        const { error: accUp } = await supabase
          .from('place_accessibility_reviews')
          .update(updatePayload)
          .eq('review_id', reviewId);
        if (accUp) throw accUp;
      } else {
        const insertPayload: Record<string, boolean | number> = {
          review_id: reviewId,
          place_id: placeId,
        };
        for (const k of ACCESSIBILITY_REVIEW_KEYS) {
          insertPayload[k] = accessibility[k];
        }
        const { error: accIns } = await supabase
          .from('place_accessibility_reviews')
          .insert(insertPayload);
        if (accIns) throw accIns;
      }

      await syncPlaceReviewStats(placeId);
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
      myReviewWithAccessibility,
      submitPlaceReview,
      accessibilityConsensusForPlace,
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
      myReviewWithAccessibility,
      submitPlaceReview,
      accessibilityConsensusForPlace,
      refreshPlaces,
      isLoading,
    ],
  );

  return (
    <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
  );
}
