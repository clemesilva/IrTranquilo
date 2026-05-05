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
  type PlaceReviewConsensusRow,
  consensusFieldStrictYes,
} from '../lib/reviewAccessibilityConsensus';
import { reviewMediaBasePathForPlace } from '../lib/reviewMediaPaths';
import { storageObjectPathFromReviewMediaPublicUrl } from '../lib/reviewMediaStorage';
import { syncPlaceReviewStats } from '../lib/syncPlaceReviewStats';
import type { Place, PlaceCategory } from '../types/place';
import {
  ACCESSIBILITY_REVIEW_KEYS,
  type AccessibilityReviewValues,
  type PlaceReviewMediaInput,
} from '../types/reviewAccessibility';
import {
  PlacesContext,
  ACCESSIBILITY_FILTER_TOGGLE_KEYS,
  type AccessibilityFilters,
  type PlaceWithStats,
} from './placesContext';

/** Columnas de checklist en `reviews` (literal fijo para tipos de supabase-js). */
const REVIEW_CHECKLIST_SELECT =
  'id, place_id, source, parking_accessible, nearby_parking, service_dogs_allowed, ramp_available, non_slip_surface, accessible_route, elevator_available, mechanical_stairs, wide_entrance, circulation_clear, lowered_counter, accessible_bathroom, dining_table_accessible, staff_kind, staff_helpful, staff_patient';

const MY_REVIEW_WITH_ACCESSIBILITY_SELECT =
  'id, rating, comment, photo_urls, video_url, source, parking_accessible, nearby_parking, service_dogs_allowed, ramp_available, non_slip_surface, accessible_route, elevator_available, mechanical_stairs, wide_entrance, circulation_clear, lowered_counter, accessible_bathroom, dining_table_accessible, staff_kind, staff_helpful, staff_patient';

function accessibilityForDbRow(
  a: AccessibilityReviewValues,
): Record<string, boolean | null> {
  const o: Record<string, boolean | null> = {};
  for (const k of ACCESSIBILITY_REVIEW_KEYS) {
    o[k] = a[k];
  }
  return o;
}

const defaultFilters: AccessibilityFilters = {
  recommendedOnly: false,
  ratingBand: 'all',
  minRating: null,
  parking_accessible: false,
  nearby_parking: false,
  service_dogs_allowed: false,
  ramp_available: false,
  non_slip_surface: false,
  accessible_route: false,
  elevator_available: false,
  mechanical_stairs: false,
  wide_entrance: false,
  circulation_clear: false,
  lowered_counter: false,
  accessible_bathroom: false,
  dining_table_accessible: false,
  staff_kind: false,
  staff_helpful: false,
  staff_patient: false,
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
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  google_ratings_total: number | null;
  google_photo_url: string | null;
  wheelchair_accessible: boolean | null;
  price_level: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  avg_rating: number | null;
  rating_band: PlaceWithStats['band'] | null;
  review_count: number | null;
  active_reports?: number | { count: number }[] | null;
};

type DbReviewRow = {
  id: number;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  author_id: string | null;
  source?: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
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
    phone: place.phone ?? null,
    website: place.website ?? null,
    googleRating: place.google_rating ?? null,
    googleRatingsTotal: place.google_ratings_total ?? null,
    googlePhotoUrl: place.google_photo_url ?? null,
    wheelchairAccessible: place.wheelchair_accessible ?? null,
    priceLevel: place.price_level ?? null,
    createdBy: place.created_by ?? null,
    createdAt: place.created_at ?? null,
    updatedAt: place.updated_at ?? null,
  };
}

function mapPlaceWithStats(place: DbPlaceRow): PlaceWithStats {
  const mapped = mapPlaceFromDB(place);
  let activeReportsCount = 0;
  if (typeof place.active_reports === 'number') {
    activeReportsCount = place.active_reports;
  } else if (Array.isArray(place.active_reports)) {
    const first = place.active_reports[0] as { count?: number } | undefined;
    if (first?.count != null) {
      activeReportsCount = first.count;
    }
  }

  return {
    ...mapped,
    avgRating: place.avg_rating ?? 0,
    band: place.rating_band ?? 'not_recommended',
    reviewCount: place.review_count ?? 0,
    activeReportsCount,
  };
}

function buildConsensusByPlaceId(
  rows: PlaceReviewConsensusRow[],
): Record<number, AccessibilityConsensusMap> {
  const byPlace: Record<number, PlaceReviewConsensusRow[]> = {};
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
    const nowIso = new Date().toISOString();
    const [placesRes, revRes] = await Promise.all([
      supabase
        .from('places')
        .select('*, active_reports:place_reports(count)')
        .gt('place_reports.expires_at', nowIso)
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select(REVIEW_CHECKLIST_SELECT),
    ]);

    if (placesRes.error) throw placesRes.error;
    if (revRes.error) throw revRes.error;

    const mapped = ((placesRes.data || []) as DbPlaceRow[]).map(
      mapPlaceWithStats,
    );
    const consensusMap = buildConsensusByPlaceId(
      (revRes.data || []) as unknown as PlaceReviewConsensusRow[],
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
    (key: keyof AccessibilityFilters, value: boolean | number | string | null) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setCategory('all');
    setSearch('');
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
      if (filters.ratingBand !== 'all' && p.band !== filters.ratingBand) return false;

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
      .select(
        'id, rating, comment, created_at, author_id, source, photo_urls, video_url, helpful_count, users(display_name)',
      )
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    return ((data || []) as DbReviewRow[])
      .filter((r) => (r.source ?? 'user').toLowerCase() !== 'google')
      .map((r) => ({
        id: r.id,
        placeId,
        rating: r.rating ?? 0,
        comment: r.comment,
        createdAt: r.created_at,
        authorId: r.author_id,
        authorName: Array.isArray(r.users)
          ? (r.users[0]?.display_name ?? null)
          : (r.users?.display_name ?? null),
        photoUrls: r.photo_urls ?? null,
        videoUrl: r.video_url ?? null,
        helpfulCount: (r as { helpful_count?: number }).helpful_count ?? 0,
      }));
  }, []);

  const myReviewWithAccessibility = useCallback(async (placeId: number) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;

    const { data: revRaw, error: revErr } = await supabase
      .from('reviews')
      .select(MY_REVIEW_WITH_ACCESSIBILITY_SELECT)
      .eq('place_id', placeId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (revErr) {
      console.error('Error loading my review:', revErr);
      return null;
    }
    if (!revRaw) return null;

    const rev = revRaw as unknown as Record<string, unknown>;

    const accessibility = rowToAccessibilityValues(rev);

    return {
      id: rev.id as number,
      rating: rev.rating as number | null,
      comment: rev.comment as string | null,
      accessibility,
      photoUrls: Array.isArray(rev.photo_urls) ? rev.photo_urls : null,
      videoUrl: typeof rev.video_url === 'string' ? rev.video_url : null,
      source: (typeof rev.source === 'string' ? rev.source : null) ?? null,
    };
  }, []);

  const accessibilityConsensusForPlace = useCallback(
    async (placeId: number) => {
      const { data, error } = await supabase
        .from('reviews')
        .select(REVIEW_CHECKLIST_SELECT)
        .eq('place_id', placeId);

      if (error) {
        console.error('Error loading accessibility consensus:', error);
        return computeAccessibilityConsensus([]);
      }

      return computeAccessibilityConsensus(
        (data || []) as unknown as PlaceReviewConsensusRow[],
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
      mediaInput: PlaceReviewMediaInput,
    ) => {
      const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
      const cleanComment = comment?.trim() ? comment.trim() : null;

      const retainPhotoUrls = mediaInput.retainPhotoUrls.filter(Boolean);
      const retainVideoUrl = mediaInput.retainVideoUrl;
      const newPhotos = mediaInput.newPhotos;
      const newVideo = mediaInput.newVideo;

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

      let previousPhotoUrls: string[] = [];
      let previousVideoUrl: string | null = null;
      if (existing?.id != null) {
        const { data: prevMedia, error: prevMediaErr } = await supabase
          .from('reviews')
          .select('photo_urls, video_url')
          .eq('id', existing.id)
          .maybeSingle();
        if (!prevMediaErr && prevMedia) {
          previousPhotoUrls = Array.isArray(prevMedia.photo_urls)
            ? (prevMedia.photo_urls as string[]).filter(Boolean)
            : [];
          previousVideoUrl =
            typeof prevMedia.video_url === 'string' && prevMedia.video_url
              ? prevMedia.video_url
              : null;
        }
      }

      let reviewId: number;

      const checklistRow = accessibilityForDbRow(accessibility);

      if (existing?.id != null) {
        reviewId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('reviews')
          .insert({
            place_id: placeId,
            author_id: user.id,
            rating: cleanRating,
            comment: cleanComment,
            source: 'user',
            ...checklistRow,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        if (!inserted?.id) throw new Error('No se pudo crear la reseña.');
        reviewId = inserted.id;
      }

      const { data: placeRow, error: placeNameErr } = await supabase
        .from('places')
        .select('name')
        .eq('id', placeId)
        .maybeSingle();
      if (placeNameErr) throw placeNameErr;
      const placeNameForPath = placeRow?.name?.trim() || 'lugar';
      const basePath = reviewMediaBasePathForPlace(placeNameForPath);
      const slots = Math.max(0, 5 - retainPhotoUrls.length);
      const uploadedNewPhotoUrls: string[] = [];
      for (const photo of newPhotos.slice(0, slots)) {
        const ext = photo.name.split('.').pop() ?? 'jpg';
        const path = `${basePath}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('review-media')
          .upload(path, photo, {
            contentType: photo.type || undefined,
            upsert: false,
          });
        if (upErr) {
          throw new Error(
            `No se pudo subir la foto "${photo.name}": ${upErr.message}`,
          );
        }
        const { data: urlData } = supabase.storage
          .from('review-media')
          .getPublicUrl(path);
        if (urlData.publicUrl) uploadedNewPhotoUrls.push(urlData.publicUrl);
      }
      const finalPhotoUrls = [
        ...retainPhotoUrls,
        ...uploadedNewPhotoUrls,
      ].slice(0, 5);

      let finalVideoUrl: string | null = retainVideoUrl;
      if (newVideo) {
        const ext = newVideo.name.split('.').pop() ?? 'mp4';
        const path = `${basePath}/video-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('review-media')
          .upload(path, newVideo, {
            contentType: newVideo.type || undefined,
            upsert: false,
          });
        if (upErr) {
          throw new Error(`No se pudo subir el video: ${upErr.message}`);
        }
        const { data: urlData } = supabase.storage
          .from('review-media')
          .getPublicUrl(path);
        finalVideoUrl = urlData.publicUrl ?? null;
      }

      const { error: revUpErr } = await supabase
        .from('reviews')
        .update({
          rating: cleanRating,
          comment: cleanComment,
          photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
          video_url: finalVideoUrl,
          source: 'user',
          ...checklistRow,
        })
        .eq('id', reviewId);
      if (revUpErr) throw revUpErr;

      const pathsToRemove: string[] = [];
      for (const url of previousPhotoUrls) {
        if (!finalPhotoUrls.includes(url)) {
          const p = storageObjectPathFromReviewMediaPublicUrl(url);
          if (p) pathsToRemove.push(p);
        }
      }
      if (previousVideoUrl && previousVideoUrl !== finalVideoUrl) {
        const p = storageObjectPathFromReviewMediaPublicUrl(previousVideoUrl);
        if (p) pathsToRemove.push(p);
      }
      const uniquePaths = [...new Set(pathsToRemove)];
      if (uniquePaths.length > 0) {
        const { error: rmErr } = await supabase.storage
          .from('review-media')
          .remove(uniquePaths);
        if (rmErr) {
          console.warn(
            'No se pudieron eliminar archivos antiguos en Storage:',
            rmErr.message,
          );
        }
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
