import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { CATEGORIES, type PlaceCategory } from '../types';
import { ACCESSIBILITY_FIELD_GROUPS } from '../types/reviewAccessibility';
import { COLORS, getPinColor } from '../styles/colors';
import type { PlaceWithStats } from '../context/placesContext';
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../lib/mapDefaults';
import {
  buildPinElement,
  buildPinSvgString,
  categoryGlyph,
  formatPinLabel,
} from '../lib/pins';
import { ensureGoogleMapsLoaded } from '../lib/googleMaps';
import { PlaceMapSidebar } from '../components/map/PlaceMapSidebar';
import {
  fitMapToPlaceWithUiPadding,
  MAP_UI_PADDING_LANDING,
} from '../lib/mapPlaceFocus';
import { AddPlacePanel } from '../components/places/AddPlacePanel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AppIcons, CategoryIcon } from '@/components/icons/appIcons';
import { ChevronDown } from 'lucide-react';
import { LogoPin } from '@/components/icons/LogoPin';

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const {
    allPlaces,
    filteredPlaces,
    setSearch,
    category: contextCategory,
    setCategory,
    filters,
    toggleFilter,
    setFilterValue,
    resetFilters,
  } = usePlaces();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<
    {
      marker: google.maps.marker.AdvancedMarkerElement;
      place: PlaceWithStats;
      el: HTMLDivElement;
    }[]
  >([]);
  const parkingMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    [],
  );
  const prevSelectedIdRef = useRef<number | null>(null);
  const selectedPlaceIdRef = useRef<number | null>(null);
  const selectPlaceRef = useRef<(id: number) => void>(() => {});
  const enterMapFullscreenRef = useRef<(onReady?: () => void) => void>(
    () => {},
  );
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const panToPlaceForDetailRef = useRef<
    (place: PlaceWithStats, snap?: number) => void
  >(() => {});
  const [mapReady, setMapReady] = useState(false);
  const [search, setLocalSearch] = useState('');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(() => {
    const v = searchParams.get('place');
    return v ? Number(v) : null;
  });
  useEffect(() => {
    selectedPlaceIdRef.current = selectedPlaceId;
  });

  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [sidebarSnap, setSidebarSnap] = useState(0);
  const sidebarSnapRef = useRef(sidebarSnap);
  useEffect(() => {
    sidebarSnapRef.current = sidebarSnap;
  }, [sidebarSnap]);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [addPlaceModalKey, setAddPlaceModalKey] = useState(0);
  const [addPlaceDraft, setAddPlaceDraft] = useState<[number, number] | null>(
    null,
  );

  const activeFilterCount =
    (filters.recommendedOnly ? 1 : 0) +
    (filters.ratingBand !== 'all' ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0) +
    (
      [
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
      ] as const
    ).filter((k) => filters[k]).length;

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allPlaces
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allPlaces, search]);

  const selectedPlaceData = useMemo(() => {
    if (selectedPlaceId == null) return null;
    return filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null;
  }, [selectedPlaceId, filteredPlaces]);

  const selectPlace = useCallback(
    (id: number | null) => {
      setSelectedPlaceId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id == null) next.delete('place');
          else next.set('place', String(id));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (selectedPlaceId == null) return;
    if (!filteredPlaces.some((p) => p.id === selectedPlaceId)) {
      queueMicrotask(() => selectPlace(null));
    }
  }, [filteredPlaces, selectedPlaceId, selectPlace]);

  const panToPlaceForDetail = useCallback(
    (place: PlaceWithStats, snap?: number) => {
      const map = mapRef.current;
      if (!map) return;
      const resolvedSnap = snap ?? sidebarSnapRef.current;
      const topUiPx = 110; // search bar + categories en mobile
      const panelPx =
        resolvedSnap >= 2
          ? Math.round(window.innerHeight * 0.88)
          : resolvedSnap === 1
            ? Math.round(window.innerHeight * 0.38)
            : Math.round(window.innerHeight * 0.12);
      // mobileBottomPx = panelPx - topUiPx centra el pin en el área visible real
      const mobileBottomPx = Math.max(0, panelPx - topUiPx);
      fitMapToPlaceWithUiPadding(
        map,
        place.latitude,
        place.longitude,
        MAP_UI_PADDING_LANDING,
        { mobileBottomPx },
      );
    },
    [],
  );

  const enterMapFullscreen = useCallback((onReady?: () => void) => {
    if (window.innerWidth >= 640) {
      onReady?.();
      return;
    }
    setMapFullscreen(true);
    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
      onReady?.();
    }, 50);
  }, []);

  const exitMapFullscreen = useCallback((onReady?: () => void) => {
    setMapFullscreen(false);
    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
      onReady?.();
    }, 50);
  }, []);

  useEffect(() => {
    selectPlaceRef.current = selectPlace;
  }, [selectPlace]);
  useEffect(() => {
    enterMapFullscreenRef.current = enterMapFullscreen;
  }, [enterMapFullscreen]);
  useEffect(() => {
    panToPlaceForDetailRef.current = panToPlaceForDetail;
  }, [panToPlaceForDetail]);

  const focusPlaceOnMap = (place: PlaceWithStats) => {
    selectPlace(place.id);
    enterMapFullscreen(() => panToPlaceForDetail(place));
  };

  // Volver desde PlaceDetailPage en mobile → abrir mapa fullscreen
  useEffect(() => {
    if ((location.state as { mapFullscreen?: boolean } | null)?.mapFullscreen) {
      setTimeout(() => enterMapFullscreen(), 100);
    }
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map
  useEffect(() => {
    ensureGoogleMapsLoaded().then(() => {
      const el = document.getElementById('landing-map');
      if (!el || mapRef.current) return;
      const map = new google.maps.Map(el, {
        center: { lat: SANTIAGO_CENTER[0], lng: SANTIAGO_CENTER[1] },
        zoom: SANTIAGO_ZOOM,
        mapId: '170d20fc23bb3c89384de3a1',
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      mapRef.current = null;
    };
  }, []);

  // Estacionamientos de Google Places
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const MIN_ZOOM_PARKING = 15;
    const MIN_ZOOM_LABEL = 17;

    const service = new google.maps.places.PlacesService(map);

    // Control de visibilidad por zoom — declarado antes de fetchPage para poder usarlo en el callback
    const updateParkingVisibility = () => {
      const z = map.getZoom() ?? 0;
      parkingMarkersRef.current.forEach((m) => {
        m.map = z >= MIN_ZOOM_PARKING ? map : null;
        const label = (m.content as HTMLElement)?.querySelector<HTMLElement>(
          '.parking-pin__label',
        );
        if (label) label.style.display = z >= MIN_ZOOM_LABEL ? '' : 'none';
      });
    };

    const fetchPage = (request: object, nextPageToken?: string) => {
      const req = nextPageToken
        ? { ...request, pageToken: nextPageToken }
        : request;
      service.nearbySearch(req, (results, status, pagination) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results)
          return;
        results.forEach((place) => {
          const loc = place.geometry?.location;
          if (!loc) return;
          const name = place.name ?? '';
          const address = place.vicinity ?? '';
          const el = document.createElement('div');
          el.className = 'parking-pin';
          el.innerHTML = `<div class="parking-pin__tooltip"><div class="parking-pin__tooltip-name">${name}</div>${address ? `<div class="parking-pin__tooltip-address">${address}</div>` : ''}</div><div class="parking-pin__icon">P</div><div class="parking-pin__label">${name}</div>`;
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: null,
            position: { lat: loc.lat(), lng: loc.lng() },
            content: el,
            zIndex: 1,
          });
          parkingMarkersRef.current.push(marker);
        });
        // Aplicar visibilidad según zoom actual tras agregar cada página
        updateParkingVisibility();
        if (pagination?.hasNextPage) {
          setTimeout(() => pagination.nextPage(), 300);
        }
      });
    };

    fetchPage({
      location: { lat: SANTIAGO_CENTER[0], lng: SANTIAGO_CENTER[1] },
      radius: 8000,
      type: 'parking',
    });

    const listener = map.addListener('zoom_changed', updateParkingVisibility);

    return () => {
      google.maps.event.removeListener(listener);
      parkingMarkersRef.current.forEach((m) => {
        m.map = null;
      });
      parkingMarkersRef.current = [];
    };
  }, [mapReady]);

  // Bloquear interacción del mapa mientras se editan filtros
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({
      gestureHandling: showFiltersModal ? 'none' : 'greedy',
    });
    return () => map.setOptions({ gestureHandling: 'greedy' });
  }, [showFiltersModal]);

  // Al restaurar un lugar seleccionado desde URL, centrar el mapa en él
  useEffect(() => {
    if (!selectedPlaceData) return;
    const tryPan = () => {
      if (mapRef.current) {
        panToPlaceForDetail(selectedPlaceData);
      } else {
        setTimeout(tryPan, 150);
      }
    };
    setTimeout(tryPan, 300);
    // Solo al montar (restauración desde URL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ocultar pins normales a zoom bajo; mostrar etiqueta de nombre a zoom cercano
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const MIN_ZOOM = 12;
    const MIN_ZOOM_LABEL = 15;
    const update = () => {
      const z = map.getZoom() ?? 0;
      markersRef.current.forEach(({ marker, place, el }) => {
        const isSelected = selectedPlaceId === place.id;
        const shouldShow = z >= MIN_ZOOM || isSelected;
        marker.map = shouldShow ? map : null;
        const label = el.querySelector<HTMLElement>('.map-pin__name-label');
        if (label) {
          if (isSelected) {
            label.style.display = '';
            label.style.color = '#1a56db';
            label.style.fontWeight = '700';
            label.style.fontSize = '11px';
          } else {
            label.style.display = z >= MIN_ZOOM_LABEL ? '' : 'none';
            label.style.color = '';
            label.style.fontWeight = '';
            label.style.fontSize = '';
          }
        }
      });
    };
    const listener = map.addListener('zoom_changed', update);
    update();
    return () => google.maps.event.removeListener(listener);
  }, [mapReady, selectedPlaceId]);

  // Create markers; re-runs only when places change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    markersRef.current = [];
    prevSelectedIdRef.current = null;

    const currentSelectedId = selectedPlaceIdRef.current;

    filteredPlaces.forEach((place) => {
      if (!place.latitude || !place.longitude) return;
      const isSelected = place.id === currentSelectedId;
      const el = buildPinElement({
        color: getPinColor(place.avgRating),
        glyph: categoryGlyph(place.category),
        selected: isSelected,
        size: isSelected ? 30 : 24,
        hasAlert: (place.activeReportsCount ?? 0) > 0,
        name: place.name,
        index: markersRef.current.length,
      });
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: place.latitude, lng: place.longitude },
        content: el,
        zIndex: isSelected ? 100 : 0,
      });
      marker.addListener('click', () => {
        selectPlaceRef.current(place.id);
        enterMapFullscreenRef.current(() =>
          panToPlaceForDetailRef.current(place),
        );
      });
      markersRef.current.push({ marker, place, el });
    });

    prevSelectedIdRef.current = currentSelectedId;
  }, [mapReady, filteredPlaces]);

  // Update only the two affected markers when selection changes (animated)
  useEffect(() => {
    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedPlaceId ?? null;

    markersRef.current.forEach(({ marker, place, el }) => {
      const wasSelected = place.id === prevId;
      const isSelected = place.id === selectedPlaceId;
      if (!wasSelected && !isSelected) return;

      const pinParams = {
        color: getPinColor(place.avgRating),
        glyph: categoryGlyph(place.category),
        hasAlert: (place.activeReportsCount ?? 0) > 0,
      };

      const attachLabel = (selected: boolean) => {
        const existing = el.querySelector('.map-pin__name-label');
        if (existing) existing.remove();
        const label = document.createElement('div');
        const side = el.dataset.labelSide ?? 'right';
        label.className = `map-pin__name-label map-pin__name-label--${side}`;
        label.style.whiteSpace = 'pre';
        label.textContent = formatPinLabel(place.name);
        if (selected) {
          label.style.color = '#1A56A0';
          label.style.fontWeight = '800';
          label.style.fontSize = '14px';
          label.style.textShadow = 'none';
          label.style.display = '';
        } else {
          label.style.color = getPinColor(place.avgRating);
          const z = mapRef.current?.getZoom() ?? 0;
          label.style.display = z >= 15 ? '' : 'none';
        }
        el.appendChild(label);
      };

      if (isSelected) {
        el.innerHTML = buildPinSvgString({
          ...pinParams,
          selected: true,
          size: 30,
        });
        attachLabel(true);
        el.className = 'map-pin map-pin--entering';
        el.addEventListener(
          'animationend',
          () => {
            el.className = 'map-pin';
          },
          { once: true },
        );
        marker.zIndex = 100;
      } else {
        el.className = 'map-pin map-pin--leaving';
        el.addEventListener(
          'animationend',
          () => {
            el.innerHTML = buildPinSvgString({
              ...pinParams,
              selected: false,
              size: 24,
            });
            attachLabel(false);
            el.className = 'map-pin map-pin--appearing';
            el.addEventListener(
              'animationend',
              () => {
                el.className = 'map-pin';
              },
              { once: true },
            );
          },
          { once: true },
        );
        marker.zIndex = 0;
      }
    });
  }, [selectedPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showAddPlaceModal || !addPlaceDraft) return;
    map.setZoom(Math.max(map.getZoom() ?? 0, 15));
    map.panTo({ lat: addPlaceDraft[0], lng: addPlaceDraft[1] });
  }, [showAddPlaceModal, addPlaceDraft]);

  const userDisplayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')?.[0] ||
    'Usuario';

  return (
    <div
      className='flex flex-col min-h-screen'
      style={{ backgroundColor: COLORS.background }}
    >
      {/* Header */}
      <header
        className='mx-auto mt-5 w-fit rounded-2xl border bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur'
        style={{ borderColor: `${COLORS.primary}40` }}
      >
        <div className='flex items-center justify-between gap-6'>
          {/* Brand icon */}
          <div className='flex h-9 w-9 flex-shrink-0 items-center justify-center'>
            <LogoPin size={32} />
          </div>

          {/* Actions */}
          <div className='flex items-center gap-2'>
            {/* Marco Legal */}
            <button
              onClick={() => navigate('/marco-legal')}
              className='flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-50'
              style={{ borderColor: COLORS.border, color: COLORS.text }}
              title='Marco Legal'
            >
              <AppIcons.Scale size={15} aria-hidden />
              <span className='hidden sm:inline'>Marco Legal</span>
            </button>

            {/* Separador */}
            <div
              className='h-5 w-px'
              style={{ backgroundColor: COLORS.border }}
            />

            {/* Añadir lugar */}
            <button
              onClick={() => {
                setShowAddPlaceModal(true);
                setAddPlaceModalKey((k) => k + 1);
              }}
              className='flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-50'
              style={{ borderColor: COLORS.border, color: COLORS.text }}
              title='Añadir lugar'
            >
              <AppIcons.Plus size={15} aria-hidden />
              <span className='hidden sm:inline'>Añadir Lugar</span>
            </button>

            {/* Separador */}
            <div
              className='h-5 w-px'
              style={{ backgroundColor: COLORS.border }}
            />

            {/* Nombre usuario */}
            <span
              className='max-w-[120px] truncate text-sm font-medium'
              style={{ color: COLORS.text }}
            >
              {userDisplayName}
            </span>

            {/* Cerrar sesión */}
            <button
              onClick={signOut}
              className='flex h-9 w-9 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50'
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
              title='Cerrar sesión'
            >
              <AppIcons.LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='px-6 pb-8 pt-12'>
        <div className='mx-auto max-w-3xl text-center'>
          {/* Badge */}

          {/* Title */}
          <h2
            className='mb-4 text-3xl font-extrabold leading-tight sm:text-4xl'
            style={{ color: COLORS.text }}
          >
            Anda tranquilo,{' '}
            <span
              style={{
                background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.success})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              nosotros ya fuimos.
            </span>
          </h2>

          {/* Description */}
          <p
            className='mb-4 text-base leading-relaxed'
            style={{ color: COLORS.textMuted }}
          >
            Descubre qué tan accesible es un lugar antes de ir — rampas,
            escaleras, estacionamiento, baños y más, reportado por gente que ya
            estuvo ahí.
          </p>

          {/* CTA secundario */}
          <p
            className='mb-8 text-sm leading-relaxed'
            style={{ color: COLORS.textLight }}
          >
            ¿Ya fuiste a algún lugar? Agrégalo, califica su accesibilidad y
            ayuda a otros a ir tranquilos también.
          </p>
        </div>
      </section>

      {/* Leyenda del mapa */}
      <div
        className='flex items-center justify-center sm:justify-end gap-3 mx-4 px-4 -mt-6 sm:-mt-2 pb-2 sm:pb-3 text-xs sm:text-sm'
        style={{ color: COLORS.textMuted }}
      >
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-2 sm:h-3 sm:w-3 rounded-full'
            style={{ backgroundColor: COLORS.success }}
          />
          Recomendado
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-2 sm:h-3 sm:w-3 rounded-full'
            style={{ backgroundColor: COLORS.warning }}
          />
          Aceptable
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-2 sm:h-3 sm:w-3 rounded-full'
            style={{ backgroundColor: COLORS.danger }}
          />
          No recomendado
        </span>
      </div>

      {/* Map Container with Margins */}
      <div
        className={
          mapFullscreen
            ? 'fixed inset-0 z-[9000] sm:relative sm:inset-auto sm:z-auto sm:h-[65vh] sm:min-h-110 sm:max-h-195'
            : 'relative h-[65vh] min-h-110 max-h-195'
        }
      >
        {/* Botón Volver — solo mobile fullscreen */}
        {mapFullscreen && (
          <button
            onClick={() => {
              const place = selectedPlaceData;
              selectPlace(null);
              setLocalSearch('');
              setSearch('');
              exitMapFullscreen(() => {
                if (place && mapRef.current) {
                  mapRef.current.panTo({
                    lat: place.latitude,
                    lng: place.longitude,
                  });
                }
              });
            }}
            className='absolute top-4 left-4 z-[9100] sm:hidden flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-lg'
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.text,
            }}
          >
            <AppIcons.ArrowLeft size={15} aria-hidden />
            Volver
          </button>
        )}

        <div
          id='landing-map'
          className='w-full h-full rounded-lg overflow-hidden shadow-lg'
          style={{ pointerEvents: showFiltersModal ? 'none' : 'auto' }}
        />

        {selectedPlaceData ? (
          <PlaceMapSidebar
            place={selectedPlaceData}
            onClose={() => {
              selectPlace(null);
              setLocalSearch('');
              setSearch('');
            }}
            onSnapChange={setSidebarSnap}
          />
        ) : null}

        {/* Botón + flotante en esquina superior derecha del mapa */}
        {!selectedPlaceData && (
          <>
            <button
              onClick={() => {
                setShowAddPlaceModal(true);
                setAddPlaceModalKey((k) => k + 1);
              }}
              className='absolute top-60 right-4 sm:top-20 sm:right-10 z-[2000] flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg pointer-events-auto transition-opacity hover:opacity-90 active:opacity-80'
              style={{ backgroundColor: COLORS.primary, color: '#fff' }}
              title='Añadir lugar'
              aria-label='Añadir lugar'
            >
              <AppIcons.Plus size={20} aria-hidden />
            </button>
          </>
        )}

        {/* ── DESKTOP: filtros | buscador | carrusel categorías ── */}
        <div className='absolute top-4 left-4 right-4 z-[1600] pointer-events-auto hidden sm:flex items-center gap-3'>
          {/* Filtros */}
          <button
            onClick={() => setShowFiltersModal(true)}
            className='flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-base font-semibold shadow-md transition-colors'
            style={{
              backgroundColor:
                activeFilterCount > 0 ? COLORS.primary : COLORS.card,
              color: activeFilterCount > 0 ? '#fff' : COLORS.text,
              borderColor: COLORS.text,
            }}
          >
            <AppIcons.Settings
              className='h-3.5 w-3.5'
              style={{ color: activeFilterCount > 0 ? '#fff' : COLORS.primary }}
              aria-hidden
            />
            Filtros
            {activeFilterCount > 0 && (
              <span className='ml-0.5 rounded-full bg-white/30 px-1.5 py-0.5 text-xs'>
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Search + carrusel centrados */}
          <div className='flex flex-1 items-center justify-center gap-6'>
            {/* Search box */}
            <div
              className='relative flex shrink-0 items-center gap-2 rounded-2xl border p-2 shadow-lg'
              style={{
                backgroundColor: COLORS.card,
                borderColor: COLORS.border,
                width: 440,
              }}
            >
              <div className='relative flex-1'>
                <AppIcons.Search
                  size={15}
                  className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2'
                  style={{ color: COLORS.textLight }}
                  aria-hidden
                />
                <Input
                  type='search'
                  placeholder='Adónde quieres ir...'
                  value={search}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalSearch(v);
                    if (!v) setSearch('');
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() =>
                    window.setTimeout(() => setShowSearchDropdown(false), 120)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const first = searchSuggestions[0];
                      if (first) {
                        focusPlaceOnMap(first);
                        return;
                      }
                      navigate(`/?search=${encodeURIComponent(search)}`);
                    }
                  }}
                  className='h-9 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0'
                />
                {showSearchDropdown && searchSuggestions.length > 0 && (
                  <div className='absolute z-[2600] mt-2 max-h-64 w-full overflow-y-auto rounded-xl border bg-white shadow-xl'>
                    {searchSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type='button'
                        className='block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50'
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setLocalSearch(p.name);
                          setShowSearchDropdown(false);
                          focusPlaceOnMap(p);
                        }}
                      >
                        <div
                          className='font-medium'
                          style={{ color: COLORS.text }}
                        >
                          {p.name}
                        </div>
                        <div
                          className='text-xs'
                          style={{ color: COLORS.textMuted }}
                        >
                          {p.address}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                className='h-9 rounded-xl px-4 text-sm'
                style={{ backgroundColor: COLORS.primary }}
                onClick={() =>
                  navigate(`/?search=${encodeURIComponent(search)}`)
                }
              >
                Buscar
              </Button>
            </div>

            {/* Carrusel de categorías — flechas absolute que cortan la última pill */}
            <div className='relative' style={{ width: 520 }}>
              {/* Flecha izquierda */}
              <button
                onClick={() =>
                  categoryScrollRef.current?.scrollBy({
                    left: -220,
                    behavior: 'smooth',
                  })
                }
                className='absolute -left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-white shadow-md border transition-colors hover:bg-gray-50'
                style={{
                  width: 30,
                  height: 30,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
              >
                <ChevronDown size={14} className='rotate-90' />
              </button>
              {/* Flecha derecha */}
              <button
                onClick={() =>
                  categoryScrollRef.current?.scrollBy({
                    left: 220,
                    behavior: 'smooth',
                  })
                }
                className='absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-white shadow-md border transition-colors hover:bg-gray-50'
                style={{
                  width: 30,
                  height: 30,
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
              >
                <ChevronDown size={14} className='-rotate-90' />
              </button>
              <div
                ref={categoryScrollRef}
                className='flex items-center gap-2 overflow-x-auto py-0.5 px-1'
                style={{ scrollbarWidth: 'none' }}
              >
                {CATEGORIES.map((cat) => {
                  const active = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        const next = active ? 'all' : cat.value;
                        setLocalCategory(next);
                        setCategory(next);
                      }}
                      className='flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-md transition-colors'
                      style={{
                        backgroundColor: active ? COLORS.primary : COLORS.card,
                        color: active ? '#fff' : COLORS.text,
                        borderColor: active ? COLORS.primary : COLORS.text,
                      }}
                    >
                      <CategoryIcon
                        category={cat.value}
                        size={14}
                        style={{ color: active ? '#fff' : COLORS.primary }}
                      />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>{' '}
          {/* end search + carrusel centrados */}
        </div>

        {/* ── MOBILE: buscador centrado ── */}
        <div
          className={`absolute ${mapFullscreen ? 'top-16' : 'top-4'} left-1/2 -translate-x-1/2 z-[1600] w-full max-w-lg px-4 pointer-events-auto sm:hidden ${mapFullscreen && selectedPlaceData && sidebarSnap === 2 ? 'hidden' : ''}`}
        >
          <div
            className='flex items-center gap-2 rounded-2xl border p-2 shadow-lg'
            style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
          >
            <div className='relative flex-1'>
              <AppIcons.Search
                size={15}
                className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2'
                style={{ color: COLORS.textLight }}
                aria-hidden
              />
              <Input
                type='search'
                placeholder='Adónde quieres ir...'
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalSearch(v);
                  if (!v) setSearch('');
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() =>
                  window.setTimeout(() => setShowSearchDropdown(false), 120)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const first = searchSuggestions[0];
                    if (first) {
                      focusPlaceOnMap(first);
                      return;
                    }
                    navigate(`/?search=${encodeURIComponent(search)}`);
                  }
                }}
                className='h-9 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0'
              />
              {showSearchDropdown && searchSuggestions.length > 0 && (
                <div className='absolute z-[2600] mt-2 max-h-64 w-full overflow-y-auto rounded-xl border bg-white shadow-xl'>
                  {searchSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      className='block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50'
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setLocalSearch(p.name);
                        setShowSearchDropdown(false);
                        focusPlaceOnMap(p);
                      }}
                    >
                      <div
                        className='font-medium'
                        style={{ color: COLORS.text }}
                      >
                        {p.name}
                      </div>
                      <div
                        className='text-xs'
                        style={{ color: COLORS.textMuted }}
                      >
                        {p.address}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              className='h-9 rounded-xl px-4 text-sm'
              style={{ backgroundColor: COLORS.primary }}
              onClick={() => navigate(`/?search=${encodeURIComponent(search)}`)}
            >
              Buscar
            </Button>
          </div>
        </div>

        {/* Filtros + categorías carrusel — solo mobile */}
        <div
          className={`absolute ${mapFullscreen ? 'top-32 sm:top-20' : 'top-20'} left-0 z-1500 w-full pointer-events-auto sm:hidden`}
        >
          <div
            className='flex items-center gap-2 overflow-x-auto px-4 pb-1'
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            <button
              onClick={() => setShowFiltersModal(true)}
              className='flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-md'
              style={{
                backgroundColor: COLORS.card,
                color: COLORS.text,
                borderColor: COLORS.border,
              }}
            >
              <AppIcons.Settings
                className='h-3.5 w-3.5'
                style={{ color: COLORS.primary }}
                aria-hidden
              />
              Filtros
              {activeFilterCount > 0 && (
                <span
                  className='ml-0.5 rounded-full px-1.5 py-0.5 text-xs text-white'
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    const next = active ? 'all' : cat.value;
                    setLocalCategory(next);
                    setCategory(next);
                    enterMapFullscreen();
                  }}
                  className='flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-md'
                  style={{
                    backgroundColor: active ? COLORS.primary : COLORS.card,
                    color: active ? '#fff' : COLORS.text,
                    borderColor: active ? COLORS.primary : COLORS.border,
                  }}
                >
                  <CategoryIcon
                    category={cat.value}
                    size={14}
                    style={{ color: active ? '#fff' : COLORS.primary }}
                  />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resultado Info - Bottom Right */}
        <div
          className='absolute bottom-7 left-4 sm:left-auto sm:right-14 z-10 rounded-lg px-3 py-1.5 shadow-sm border'
          style={{
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
          }}
        >
          <p
            className='text-xs font-medium'
            style={{ color: COLORS.textMuted }}
          >
            {filteredPlaces.length} lugares encontrados
          </p>
        </div>
      </div>

      {/* Cómo funciona */}
      <section className='py-8 sm:px-6 sm:py-16'>
        <div className='mx-auto max-w-4xl'>
          <div className='mb-6 px-4 text-center sm:mb-10'>
            <h3
              className='mb-1 text-xl font-bold sm:mb-2 sm:text-2xl'
              style={{ color: COLORS.text }}
            >
              ¿Cómo funciona?
            </h3>
            <p className='text-sm' style={{ color: COLORS.textMuted }}>
              Tres pasos para una ciudad más inclusiva
            </p>
          </div>

          {/* Mobile: marquee automático */}
          <div className='marquee-wrapper sm:hidden'>
            <div
              className='marquee-track gap-3 px-4'
              style={{ animationDuration: '18s' }}
            >
              {[...Array(2)].flatMap((_, gi) =>
                [
                  {
                    Icon: AppIcons.Search,
                    step: '1',
                    title: 'Busca',
                    desc: 'Encuentra lugares accesibles verificados por la comunidad.',
                  },
                  {
                    Icon: AppIcons.ClipboardList,
                    step: '2',
                    title: 'Evalúa',
                    desc: 'Revisa rampas, ascensores y baños accesibles antes de visitar.',
                  },
                  {
                    Icon: AppIcons.Share2,
                    step: '3',
                    title: 'Contribuye',
                    desc: 'Califica tu experiencia y ayuda a otros a moverse con libertad.',
                  },
                ].map((item) => (
                  <div
                    key={`${gi}-${item.step}`}
                    className='mr-3 flex w-52 shrink-0 flex-col items-center rounded-2xl border p-4 text-center'
                    style={{
                      backgroundColor: COLORS.card,
                      borderColor: COLORS.border,
                    }}
                  >
                    <div
                      className='mb-3 flex h-10 w-10 items-center justify-center rounded-2xl'
                      style={{ backgroundColor: `${COLORS.primary}12` }}
                    >
                      <item.Icon
                        size={20}
                        style={{ color: COLORS.primary }}
                        aria-hidden
                      />
                    </div>
                    <div
                      className='mb-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white'
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      {item.step}
                    </div>
                    <h4
                      className='mb-1 text-sm font-bold'
                      style={{ color: COLORS.text }}
                    >
                      {item.title}
                    </h4>
                    <p
                      className='text-xs leading-relaxed'
                      style={{ color: COLORS.textMuted }}
                    >
                      {item.desc}
                    </p>
                  </div>
                )),
              )}
            </div>
          </div>

          {/* Desktop: grid normal */}
          <div className='hidden sm:grid sm:grid-cols-3 sm:gap-5'>
            {[
              {
                Icon: AppIcons.Search,
                step: '1',
                title: 'Busca',
                desc: 'Encuentra lugares en Santiago con información de accesibilidad verificada por la comunidad.',
              },
              {
                Icon: AppIcons.ClipboardList,
                step: '2',
                title: 'Evalúa',
                desc: 'Revisa rampas, ascensores, baños accesibles y más antes de visitar un lugar.',
              },
              {
                Icon: AppIcons.Share2,
                step: '3',
                title: 'Contribuye',
                desc: 'Califica tu experiencia y ayuda a otras personas a moverse con libertad.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className='flex flex-col items-center rounded-2xl border p-7 text-center'
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                }}
              >
                <div
                  className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl'
                  style={{ backgroundColor: `${COLORS.primary}12` }}
                >
                  <item.Icon
                    size={26}
                    style={{ color: COLORS.primary }}
                    aria-hidden
                  />
                </div>
                <div
                  className='mb-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white'
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {item.step}
                </div>
                <h4
                  className='mb-2 text-base font-bold'
                  style={{ color: COLORS.text }}
                >
                  {item.title}
                </h4>
                <p
                  className='text-sm leading-relaxed'
                  style={{ color: COLORS.textMuted }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qué evaluamos */}
      <section
        className='py-8 sm:px-6 sm:py-14'
        style={{ backgroundColor: `${COLORS.primary}07` }}
      >
        <div className='mx-auto max-w-4xl'>
          <div className='mb-5 px-4 text-center sm:mb-8'>
            <h3
              className='mb-1 text-xl font-bold sm:mb-2 sm:text-2xl'
              style={{ color: COLORS.text }}
            >
              Qué evaluamos
            </h3>
            <p className='text-sm' style={{ color: COLORS.textMuted }}>
              8 aspectos de accesibilidad en cada lugar
            </p>
          </div>

          {/* Mobile: marquee automático */}
          <div className='marquee-wrapper sm:hidden'>
            <div
              className='marquee-track gap-2 px-4'
              style={{ animationDuration: '24s' }}
            >
              {[...Array(2)].flatMap((_, gi) =>
                [
                  { Icon: AppIcons.ParkingCircle, label: 'Estacionamiento' },
                  { Icon: AppIcons.Signpost, label: 'Señalética' },
                  { Icon: AppIcons.Accessibility, label: 'Rampa' },
                  { Icon: AppIcons.DoorOpen, label: 'Entrada amplia' },
                  { Icon: AppIcons.ArrowUpDown, label: 'Ascensor' },
                  { Icon: AppIcons.Droplets, label: 'Baño accesible' },
                  { Icon: AppIcons.MoveHorizontal, label: 'Circulación' },
                  { Icon: AppIcons.MoveVertical, label: 'Esc. mecánica' },
                ].map((feat) => (
                  <div
                    key={`${gi}-${feat.label}`}
                    className='mr-2 flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center'
                    style={{
                      backgroundColor: COLORS.card,
                      borderColor: COLORS.border,
                    }}
                  >
                    <div
                      className='flex h-8 w-8 items-center justify-center rounded-xl'
                      style={{ backgroundColor: `${COLORS.primary}10` }}
                    >
                      <feat.Icon
                        size={16}
                        style={{ color: COLORS.primary }}
                        aria-hidden
                      />
                    </div>
                    <span
                      className='text-xs font-medium leading-tight'
                      style={{ color: COLORS.text }}
                    >
                      {feat.label}
                    </span>
                  </div>
                )),
              )}
            </div>
          </div>

          {/* Desktop: grid normal */}
          <div className='hidden sm:grid sm:grid-cols-4 sm:gap-3'>
            {[
              {
                Icon: AppIcons.ParkingCircle,
                label: 'Estacionamiento accesible',
              },
              { Icon: AppIcons.Signpost, label: 'Señalética clara' },
              { Icon: AppIcons.Accessibility, label: 'Rampa disponible' },
              { Icon: AppIcons.DoorOpen, label: 'Entrada amplia' },
              { Icon: AppIcons.ArrowUpDown, label: 'Ascensor' },
              { Icon: AppIcons.Droplets, label: 'Baño accesible' },
              { Icon: AppIcons.MoveHorizontal, label: 'Circulación interna' },
              { Icon: AppIcons.MoveVertical, label: 'Escalera mecánica' },
            ].map((feat) => (
              <div
                key={feat.label}
                className='flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-shadow hover:shadow-md'
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                }}
              >
                <div
                  className='flex h-10 w-10 items-center justify-center rounded-xl'
                  style={{ backgroundColor: `${COLORS.primary}10` }}
                >
                  <feat.Icon
                    size={20}
                    style={{ color: COLORS.primary }}
                    aria-hidden
                  />
                </div>
                <span
                  className='text-xs font-medium leading-tight'
                  style={{ color: COLORS.text }}
                >
                  {feat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='px-6 py-16' style={{ backgroundColor: COLORS.card }}>
        <div className='mx-auto max-w-4xl text-center'>
          <h3
            className='mb-4 text-4xl font-bold'
            style={{ color: COLORS.primary }}
          >
            Construyendo una comunidad inclusiva
          </h3>
          <p className='mb-8 text-lg' style={{ color: COLORS.textMuted }}>
            Tu aporte ayuda a miles de personas a moverse con libertad. Descubre
            cómo estamos transformando la ciudad.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className='border-t px-6 py-12 mt-auto'
        style={{
          backgroundColor: `${COLORS.border}20`,
          borderColor: COLORS.border,
        }}
      >
        <div className='mx-auto max-w-7xl'>
          {/* Footer Content */}
          <div className='grid grid-cols-2 gap-8 mb-12 sm:grid-cols-4'>
            {/* Brand */}
            <div>
              <h4
                className='text-lg font-bold mb-2'
                style={{ color: COLORS.text }}
              >
                AndaTranquilo
              </h4>
              <p className='text-sm' style={{ color: COLORS.textMuted }}>
                Un mundo más accesible, un lugar a la vez.
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>
                Plataforma
              </h5>
              <ul
                className='space-y-2 text-sm'
                style={{ color: COLORS.textMuted }}
              >
                <li>
                  <button
                    onClick={() => navigate('/')}
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Explorar Mapa
                  </button>
                </li>
                <li>
                  <a
                    href='#'
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Cómo contribuir
                  </a>
                </li>
                <li>
                  <a
                    href='#'
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Sobre Accesibilidad
                  </a>
                </li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>
                Soporte
              </h5>
              <ul
                className='space-y-2 text-sm'
                style={{ color: COLORS.textMuted }}
              >
                <li>
                  <a
                    href='#'
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Preguntas Frecuentes
                  </a>
                </li>
                <li>
                  <a
                    href='#'
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Términos de uso
                  </a>
                </li>
                <li>
                  <a
                    href='#'
                    style={{ color: COLORS.textMuted }}
                    className='hover:font-semibold'
                  >
                    Privacidad
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>
                Mantente al día
              </h5>
              <div className='space-y-2'>
                <input
                  type='email'
                  placeholder='Tu correo electrónico'
                  className='w-full rounded-lg border px-3 py-2 text-sm'
                  style={{
                    borderColor: COLORS.border,
                    color: COLORS.text,
                  }}
                />
                <button
                  className='w-full rounded-lg px-3 py-2 text-sm font-semibold text-white'
                  style={{ backgroundColor: COLORS.primary }}
                >
                  Suscribirse
                </button>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div
            className='border-t pt-8 flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between'
            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
          >
            <p>
              &copy; 2024 AndaTranquilo. Con{' '}
              <AppIcons.Heart
                className='inline h-4 w-4 text-rose-600'
                aria-hidden
              />{' '}
              para una ciudad sin barreras.
            </p>
            <div className='flex gap-4'>
              <a
                href='#'
                style={{ color: COLORS.textMuted }}
                className='hover:font-semibold'
              >
                Twitter
              </a>
              <a
                href='#'
                style={{ color: COLORS.textMuted }}
                className='hover:font-semibold'
              >
                Instagram
              </a>
              <a
                href='#'
                style={{ color: COLORS.textMuted }}
                className='hover:font-semibold'
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent
          hideClose
          className='fixed left-0 top-0 z-9001 flex h-full max-h-dvh w-96 max-w-[min(100vw,100%)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border border-b-0 border-l-0 border-t-0 p-0 shadow-xl sm:rounded-r-xl sm:border-r'
          style={{ backgroundColor: COLORS.card }}
        >
          <VisuallyHidden>
            <DialogTitle>Filtros</DialogTitle>
          </VisuallyHidden>
          {/* Header */}
          <div
            className='border-b px-6 py-4 flex items-center justify-between'
            style={{ borderColor: COLORS.border }}
          >
            <h2 className='text-lg font-bold' style={{ color: COLORS.text }}>
              Filtros
            </h2>
            <button
              onClick={() => setShowFiltersModal(false)}
              style={{ color: COLORS.textMuted }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-y-auto p-6 space-y-5'>
            {/* 1. Calificación */}
            {(() => {
              return (
                <div className='space-y-2'>
                  <p
                    className='text-xs font-semibold uppercase tracking-wide'
                    style={{ color: COLORS.textMuted }}
                  >
                    Calificación
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {(
                      [
                        { value: 'all', label: 'Todas', stars: null },
                        {
                          value: 'recommended',
                          label: 'Recomendado',
                          stars: '4.5+ ★★★★★',
                        },
                        {
                          value: 'acceptable',
                          label: 'Aceptable',
                          stars: '3.5–4.4 ★★★★',
                        },
                        {
                          value: 'not_recommended',
                          label: 'No recomendado',
                          stars: '<3.5 ★★★',
                        },
                      ] as const
                    ).map((opt) => {
                      const active = filters.ratingBand === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type='button'
                          onClick={() =>
                            setFilterValue('ratingBand', opt.value)
                          }
                          className='flex flex-col items-start rounded-2xl border px-3 py-1.5 text-sm font-medium transition-colors'
                          style={{
                            backgroundColor: active
                              ? COLORS.primary
                              : COLORS.card,
                            color: active ? '#fff' : COLORS.text,
                            borderColor: active ? COLORS.primary : COLORS.text,
                          }}
                        >
                          <span>{opt.label}</span>
                          {opt.stars && (
                            <span className='text-xs font-normal opacity-70'>
                              {opt.stars}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 2. Categoría */}
            <div className='space-y-2'>
              <p
                className='text-xs font-semibold uppercase tracking-wide'
                style={{ color: COLORS.textMuted }}
              >
                Categoría
              </p>
              <div className='flex flex-wrap gap-2'>
                {[{ value: 'all' as const, label: 'Todas' }, ...CATEGORIES].map(
                  (c) => {
                    const active = contextCategory === c.value;
                    return (
                      <button
                        key={c.value}
                        type='button'
                        onClick={() => {
                          setLocalCategory(c.value);
                          setCategory(c.value);
                        }}
                        className='flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors'
                        style={{
                          backgroundColor: active
                            ? COLORS.primary
                            : COLORS.card,
                          color: active ? '#fff' : COLORS.text,
                          borderColor: active ? COLORS.primary : COLORS.text,
                        }}
                      >
                        {c.value !== 'all' && (
                          <CategoryIcon
                            category={c.value}
                            size={13}
                            style={{ color: active ? '#fff' : COLORS.primary }}
                          />
                        )}
                        {c.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {ACCESSIBILITY_FIELD_GROUPS.map((group) => {
              const groupIconMap: Record<string, React.ReactNode> = {
                LLEGADA: (
                  <AppIcons.Car
                    className='mr-1 inline h-3.5 w-3.5'
                    aria-hidden
                  />
                ),
                ACCESO: (
                  <AppIcons.Accessibility
                    className='mr-1 inline h-3.5 w-3.5'
                    aria-hidden
                  />
                ),
                'DESPLAZAMIENTO VERTICAL': (
                  <AppIcons.MoveVertical
                    className='mr-1 inline h-3.5 w-3.5'
                    aria-hidden
                  />
                ),
                INTERIOR: (
                  <AppIcons.Building2
                    className='mr-1 inline h-3.5 w-3.5'
                    aria-hidden
                  />
                ),
              };
              return (
                <div
                  key={group.title}
                  className='space-y-3 border-t pt-3'
                  style={{ borderColor: COLORS.border }}
                >
                  <p
                    className='text-xs font-semibold uppercase'
                    style={{ color: COLORS.textMuted }}
                  >
                    {groupIconMap[group.title] ?? (
                      <AppIcons.Building2
                        className='mr-1 inline h-3.5 w-3.5'
                        aria-hidden
                      />
                    )}
                    {group.title.charAt(0) + group.title.slice(1).toLowerCase()}
                  </p>
                  {group.fields.map((f) => (
                    <label
                      key={f.key}
                      className='flex cursor-pointer items-center gap-3'
                    >
                      <input
                        type='checkbox'
                        checked={filters[f.key]}
                        onChange={() => toggleFilter(f.key)}
                        className='h-4 w-4 rounded'
                        style={{
                          borderColor: COLORS.border,
                          accentColor: COLORS.primary,
                        }}
                      />
                      <span
                        className='cursor-help text-sm'
                        style={{ color: COLORS.text }}
                        title={f.description}
                      >
                        {f.label}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className='border-t px-6 py-4 flex gap-3'
            style={{ borderColor: COLORS.border }}
          >
            <button
              onClick={() => {
                resetFilters();
                setLocalCategory('all');
                setCategory('all');
              }}
              className='flex-1 rounded-lg border px-4 py-2 text-sm font-semibold'
              style={{
                borderColor: COLORS.primary,
                color: COLORS.primary,
                backgroundColor: COLORS.card,
              }}
            >
              Limpiar filtros
            </button>
            <button
              onClick={() => {
                setShowFiltersModal(false);
                enterMapFullscreen();
              }}
              className='flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white'
              style={{ backgroundColor: COLORS.primary }}
            >
              Aplicar filtros
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddPlaceModal}
        onOpenChange={(open) => {
          setShowAddPlaceModal(open);
          if (!open) setAddPlaceDraft(null);
        }}
      >
        <DialogContent className='w-[calc(100vw-2rem)] max-h-[85vh] max-w-lg rounded-2xl p-4 sm:w-full sm:max-w-lg'>
          <VisuallyHidden>
            <DialogTitle>Añadir lugar</DialogTitle>
          </VisuallyHidden>
          <AddPlacePanel
            key={addPlaceModalKey}
            draftLatLng={addPlaceDraft}
            onDraftLatLngChange={setAddPlaceDraft}
            onClose={() => {
              setShowAddPlaceModal(false);
              setAddPlaceDraft(null);
            }}
            onSaved={() => {
              setShowAddPlaceModal(false);
              setAddPlaceDraft(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
