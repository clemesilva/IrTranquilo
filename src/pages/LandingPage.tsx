import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { CATEGORIES, type PlaceCategory } from '../types';
import { ACCESSIBILITY_FIELD_GROUPS } from '../types/reviewAccessibility';
import { COLORS, getPinColor } from '../styles/colors';
import type { PlaceWithStats } from '../context/placesContext';
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../lib/mapDefaults';
import { fixLeafletDefaultIcons } from '../lib/leafletIcon';
import { buildPinHtml, categoryGlyph } from '../lib/pins';
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

export function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    allPlaces,
    filteredPlaces,
    setSearch,
    setCategory,
    filters,
    toggleFilter,
    setFilterValue,
    resetFilters,
  } = usePlaces();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ marker: L.Marker; place: PlaceWithStats }[]>([]);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const [search, setLocalSearch] = useState('');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(() => {
    const v = searchParams.get('place');
    return v ? Number(v) : null;
  });

  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [sidebarSnap, setSidebarSnap] = useState(0);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [ratingFilterOpen, setRatingFilterOpen] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [addPlaceDraft, setAddPlaceDraft] = useState<[number, number] | null>(
    null,
  );

  const activeFilterCount =
    (filters.recommendedOnly ? 1 : 0) +
    (filters.ratingBand !== 'all' ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0) +
    (['parking_accessible','nearby_parking','signage_clear','ramp_available',
      'mechanical_stairs','elevator_available','wide_entrance','accessible_bathroom',
      'circulation_clear','lowered_counter'] as const
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

  const panToPlaceForDetail = useCallback((place: PlaceWithStats, snap?: number) => {
    const map = mapRef.current;
    if (!map) return;
    // En mobile snap=1 → panel ocupa ~47vh, dejamos ese espacio libre abajo
    const resolvedSnap = snap ?? sidebarSnap;
    const mobileBottomPx = resolvedSnap >= 1
      ? Math.round(window.innerHeight * 0.47) + 16
      : 80;
    fitMapToPlaceWithUiPadding(
      map,
      place.latitude,
      place.longitude,
      MAP_UI_PADDING_LANDING,
      { mobileBottomPx },
    );
  }, [sidebarSnap]);

  const enterMapFullscreen = useCallback(() => {
    // Solo en mobile (ancho < 640px)
    if (window.innerWidth >= 640) return;
    setMapFullscreen(true);
    setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, []);

  const exitMapFullscreen = useCallback(() => {
    setMapFullscreen(false);
    setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, []);

  const focusPlaceOnMap = (place: PlaceWithStats) => {
    selectPlace(place.id);
    panToPlaceForDetail(place);
    enterMapFullscreen();
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      try {
        const map = L.map('landing-map', {
          scrollWheelZoom: false,
          zoomControl: false,
        }).setView(SANTIAGO_CENTER, SANTIAGO_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        // Habilitar scroll zoom solo cuando el usuario hace click en el mapa
        map.on('click', () => {
          map.scrollWheelZoom.enable();
        });

        // Desabilitar scroll zoom cuando sale del mapa
        map.on('mouseleave', () => {
          map.scrollWheelZoom.disable();
        });

        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }

    return () => {
      // Cleanup only on final unmount
    };
  }, []);

  // Ubicación en tiempo real
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map) return;
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!userMarkerRef.current) {
          userAccuracyRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: COLORS.primary,
            fillColor: COLORS.primary,
            fillOpacity: 0.08,
            weight: 1,
          }).addTo(map);
          userMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#fff',
            weight: 2.5,
            fillColor: COLORS.primary,
            fillOpacity: 1,
          }).addTo(map);
        } else {
          userMarkerRef.current.setLatLng([lat, lng]);
          userAccuracyRef.current?.setLatLng([lat, lng]);
          userAccuracyRef.current?.setRadius(accuracy);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Bloquear interacción del mapa mientras se editan filtros
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toggle = (enabled: boolean) => {
      if (enabled) {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
        map.touchZoom.enable();
      } else {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.touchZoom.disable();
      }
    };

    toggle(!showFiltersModal);
    return () => toggle(true);
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

  // Ocultar pins normales a zoom bajo
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const MIN_ZOOM = 12;
    const update = () => {
      const z = map.getZoom();
      markersRef.current.forEach(({ marker, place }) => {
        const isSelected = selectedPlaceId === place.id;
        if (z >= MIN_ZOOM || isSelected) {
          if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
          if (map.hasLayer(marker)) marker.remove();
        }
      });
    };
    map.on('zoomend', update);
    update();
    return () => {
      map.off('zoomend', update);
    };
  }, [selectedPlaceId]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    filteredPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const baseColor = getPinColor(place.avgRating);
        fixLeafletDefaultIcons();
        const isSelected = selectedPlaceId === place.id;
        const size = isSelected ? 28 : 24;
        const triangleH = 10;
        const icon = L.divIcon({
          className: '',
          html: buildPinHtml({
            color: baseColor,
            glyph: categoryGlyph(place.category),
            selected: isSelected,
            size,
            hasAlert: (place.activeReportsCount ?? 0) > 0,
          }),
          iconSize: [size, size + triangleH],
          iconAnchor: [Math.round(size / 2), size + triangleH],
          popupAnchor: [0, -(size + triangleH)],
        });

        const marker = L.marker([place.latitude, place.longitude], { icon })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectPlace(place.id);
            panToPlaceForDetail(place);
            enterMapFullscreen();
          })
          .addTo(mapRef.current!);

        markersRef.current.push({ marker, place });
      }
    });
  }, [filteredPlaces, selectedPlaceId, panToPlaceForDetail, selectPlace, enterMapFullscreen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showAddPlaceModal || !addPlaceDraft) return;
    map.flyTo(addPlaceDraft, Math.max(map.getZoom(), 15), { animate: true });
  }, [showAddPlaceModal, addPlaceDraft]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
          <div
            className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl'
            style={{ backgroundColor: `${COLORS.primary}12` }}
          >
            <AppIcons.Accessibility
              size={20}
              style={{ color: COLORS.primary }}
            />
          </div>

          {/* Actions */}
          <div className='flex items-center gap-2'>
            {/* Añadir lugar */}
            <button
              onClick={() => setShowAddPlaceModal(true)}
              className='flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-50'
              style={{ borderColor: COLORS.border, color: COLORS.text }}
              title='Añadir lugar'
            >
              <AppIcons.Plus size={15} aria-hidden />
              <span className='hidden sm:inline'>Añadir Lugar</span>
            </button>

            {/* Usuario + cerrar sesión */}
            <div className='flex items-center gap-1'>
              <span
                className='hidden max-w-[160px] truncate px-2 text-sm sm:inline'
                style={{ color: COLORS.textMuted }}
              >
                {userDisplayName}
              </span>
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
            Muévete por la ciudad{' '}
            <span
              style={{
                background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.success})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              sin barreras
            </span>
          </h2>

          {/* Description */}
          <p
            className='mb-8 text-base leading-relaxed'
            style={{ color: COLORS.textMuted }}
          >
            Encuentra espacios accesibles, evalúa sus características y ayuda a
            construir una ciudad más inclusiva para todos.
          </p>
        </div>
      </section>

      {/* Leyenda del mapa */}
      <div
        className='flex items-center justify-end gap-5 mx-4 px-4 -mt-2 pb-3 text-sm'
        style={{ color: COLORS.textMuted }}
      >
        <span className='flex items-center gap-1.5'>
          <span
            className='inline-block h-3 w-3 rounded-full'
            style={{ backgroundColor: COLORS.success }}
          />
          Recomendado
        </span>
        <span className='flex items-center gap-1.5'>
          <span
            className='inline-block h-3 w-3 rounded-full'
            style={{ backgroundColor: COLORS.warning }}
          />
          Aceptable
        </span>
        <span className='flex items-center gap-1.5'>
          <span
            className='inline-block h-3 w-3 rounded-full'
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
            onClick={() => { exitMapFullscreen(); selectPlace(null); setLocalSearch(''); setSearch(''); }}
            className='absolute top-4 left-4 z-[9100] sm:hidden flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-lg'
            style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }}
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
            onClose={() => { selectPlace(null); setLocalSearch(''); setSearch(''); }}
            onSnapChange={setSidebarSnap}
          />
        ) : null}

        {/* Botón + flotante en esquina superior derecha del mapa */}
        {!selectedPlaceData && (
          <button
            onClick={() => setShowAddPlaceModal(true)}
            className='absolute top-60 right-4 sm:top-12 sm:right-10 z-[2000] flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg pointer-events-auto transition-opacity hover:opacity-90 active:opacity-80'
            style={{ backgroundColor: COLORS.primary, color: '#fff' }}
            title='Añadir lugar'
            aria-label='Añadir lugar'
          >
            <AppIcons.Plus size={20} aria-hidden />
          </button>
        )}

        {/* Search Bar flotante sobre el mapa */}
        <div className={`absolute ${mapFullscreen ? 'top-16 sm:top-4' : 'top-4'} left-1/2 -translate-x-1/2 z-[1600] w-full max-w-lg px-4 pointer-events-auto ${mapFullscreen && selectedPlaceData && sidebarSnap === 2 ? 'hidden sm:block' : ''}`}>
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
                placeholder='Busca un lugar...'
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalSearch(v);
                  if (window.innerWidth >= 640) setSearch(v);
                  else if (!v) setSearch('');
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
                      setLocalSearch(first.name);
                      setSearch(first.name);
                      focusPlaceOnMap(first);
                      setShowSearchDropdown(false);
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
                        setSearch(p.name);
                        focusPlaceOnMap(p);
                        setShowSearchDropdown(false);
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

        {/* Filtros Button - solo desktop */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className='absolute top-8 left-8 z-1500 hidden sm:flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-lg border'
          style={{
            backgroundColor: COLORS.card,
            color: COLORS.text,
            borderColor: COLORS.border,
            pointerEvents: 'auto',
          }}
        >
          <AppIcons.Settings className='h-4 w-4' aria-hidden />
          <span>Filtros</span>
          <span className='text-sm' style={{ color: COLORS.textMuted }}>
            ({activeFilterCount})
          </span>
        </button>

        {/* Filtros + categorías carrusel — solo mobile */}
        <div className={`absolute ${mapFullscreen ? 'top-32 sm:top-20' : 'top-20'} left-0 z-1500 w-full pointer-events-auto sm:hidden`}>
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
          className='absolute bottom-8 right-8 z-10 rounded-lg px-4 py-3 shadow-lg border'
          style={{
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
          }}
        >
          <p className='text-sm font-semibold' style={{ color: COLORS.text }}>
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
          <button
            onClick={() => navigate('/about')}
            className='rounded-full px-8 py-4 font-semibold text-white'
            style={{ backgroundColor: COLORS.primary }}
          >
            Saber más del proyecto
          </button>
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
                IrTranquilo
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
              &copy; 2024 IrTranquilo. Con{' '}
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
          <VisuallyHidden><DialogTitle>Filtros</DialogTitle></VisuallyHidden>
          {/* Header */}
          <div
            className='border-b px-6 py-4 flex items-center justify-between'
            style={{ borderColor: COLORS.border }}
          >
            <h2 className='text-lg font-bold' style={{ color: COLORS.text }}>
              Filtros y Leyenda
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
              const activeRating = ([
                { value: 'all', label: 'Todas', sub: null },
                { value: 'recommended', label: 'Recomendado', sub: '4.5+' },
                { value: 'acceptable', label: 'Aceptable', sub: '3.5–4.4' },
                { value: 'not_recommended', label: 'No recomendado', sub: '<3.5' },
              ] as const).find(o => o.value === filters.ratingBand);
              return (
                <div className='rounded-xl border overflow-hidden' style={{ borderColor: COLORS.border }}>
                  <button
                    type='button'
                    onClick={() => setRatingFilterOpen(v => !v)}
                    className='flex w-full items-center justify-between px-3 py-2.5 text-left'
                    style={{ backgroundColor: '#fafafa' }}
                  >
                    <div className='flex items-center gap-2'>
                      <AppIcons.Star className='h-3.5 w-3.5' style={{ color: COLORS.primary }} aria-hidden />
                      <span className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>Calificación</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      {filters.ratingBand !== 'all' && (
                        <span className='text-xs font-medium' style={{ color: COLORS.primary }}>{activeRating?.label}</span>
                      )}
                      <ChevronDown className='h-3.5 w-3.5 transition-transform' style={{ color: COLORS.textMuted, transform: ratingFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden />
                    </div>
                  </button>
                  {ratingFilterOpen && (
                    <div className='flex flex-col divide-y' style={{ borderTopWidth: 1, borderTopColor: COLORS.border }}>
                      {([
                        { value: 'all', label: 'Todas', sub: null },
                        { value: 'recommended', label: 'Recomendado', sub: '4.5+' },
                        { value: 'acceptable', label: 'Aceptable', sub: '3.5–4.4' },
                        { value: 'not_recommended', label: 'No recomendado', sub: '<3.5' },
                      ] as const).map((opt) => {
                        const active = filters.ratingBand === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type='button'
                            onClick={() => { setFilterValue('ratingBand', opt.value); setRatingFilterOpen(false); }}
                            className='flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors'
                            style={active ? { backgroundColor: `${COLORS.primary}0d`, color: COLORS.primary, fontWeight: 600 } : { backgroundColor: '#fff', color: COLORS.text }}
                          >
                            <span className='flex-1'>{opt.label}</span>
                            {opt.sub && (
                              <span className='flex items-center gap-1 text-xs' style={{ color: active ? COLORS.primary : COLORS.textMuted }}>
                                {opt.sub}
                                <AppIcons.Star
                                  className='h-3 w-3 shrink-0'
                                  style={{ color: active ? COLORS.primary : COLORS.textLight, fill: active ? COLORS.primary : 'none' }}
                                  aria-hidden
                                />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. Categoría */}
            <div className='rounded-xl border overflow-hidden border-t' style={{ borderColor: COLORS.border }}>
              <button
                type='button'
                onClick={() => setCategoryFilterOpen(v => !v)}
                className='flex w-full items-center justify-between px-3 py-2.5 text-left'
                style={{ backgroundColor: '#fafafa' }}
              >
                <div className='flex items-center gap-2'>
                  <AppIcons.Tag className='h-3.5 w-3.5' style={{ color: COLORS.primary }} aria-hidden />
                  <span className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>Categoría</span>
                </div>
                <div className='flex items-center gap-2'>
                  {category !== 'all' && (
                    <span className='text-xs font-medium' style={{ color: COLORS.primary }}>
                      {CATEGORIES.find(c => c.value === category)?.label}
                    </span>
                  )}
                  <ChevronDown className='h-3.5 w-3.5 transition-transform' style={{ color: COLORS.textMuted, transform: categoryFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden />
                </div>
              </button>
              {categoryFilterOpen && (
                <div className='flex flex-col divide-y' style={{ borderTopWidth: 1, borderTopColor: COLORS.border }}>
                  {([{ value: 'all' as const, label: 'Todas' }, ...CATEGORIES]).map((c) => {
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        type='button'
                        onClick={() => {
                          setLocalCategory(c.value);
                          setCategory(c.value);
                          setCategoryFilterOpen(false);
                        }}
                        className='flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors'
                        style={active ? { backgroundColor: `${COLORS.primary}0d`, color: COLORS.primary, fontWeight: 600 } : { backgroundColor: '#fff', color: COLORS.text }}
                      >
                        {c.value !== 'all' && (
                          <CategoryIcon category={c.value} size={14} style={{ color: active ? COLORS.primary : COLORS.textMuted }} />
                        )}
                        <span className='flex-1'>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {ACCESSIBILITY_FIELD_GROUPS.map((group) => {
              const sectionTitle =
                group.title === 'LLEGADA'
                  ? 'Llegada'
                  : group.title === 'ENTRADA'
                    ? 'Entrada'
                    : 'Interior';
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
                    {group.title === 'LLEGADA' ? (
                      <AppIcons.Car
                        className='mr-1 inline h-3.5 w-3.5'
                        aria-hidden
                      />
                    ) : group.title === 'ENTRADA' ? (
                      <AppIcons.DoorOpen
                        className='mr-1 inline h-3.5 w-3.5'
                        aria-hidden
                      />
                    ) : (
                      <AppIcons.Building2
                        className='mr-1 inline h-3.5 w-3.5'
                        aria-hidden
                      />
                    )}
                    {sectionTitle}
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
            className='border-t px-6 py-4 space-y-3'
            style={{ borderColor: COLORS.border }}
          >
            <button
              onClick={resetFilters}
              className='w-full rounded-lg border px-4 py-2 text-sm font-semibold'
              style={{
                borderColor: COLORS.border,
                color: COLORS.text,
              }}
            >
              Limpiar filtros
            </button>
            <button
              onClick={() => {
                setShowFiltersModal(false);
                enterMapFullscreen();
              }}
              className='w-full rounded-lg px-4 py-2 text-sm font-semibold text-white'
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
          <VisuallyHidden><DialogTitle>Añadir lugar</DialogTitle></VisuallyHidden>
          <AddPlacePanel
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
