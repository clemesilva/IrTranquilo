import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL_ES,
  type PlaceCategory,
} from '../types';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
    resetFilters,
    setFilterValue,
  } = usePlaces();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ marker: L.Marker; place: PlaceWithStats }[]>([]);
  const [search, setLocalSearch] = useState('');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [addPlaceDraft, setAddPlaceDraft] = useState<[number, number] | null>(
    null,
  );

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

  useEffect(() => {
    if (selectedPlaceId == null) return;
    if (!filteredPlaces.some((p) => p.id === selectedPlaceId)) {
      queueMicrotask(() => setSelectedPlaceId(null));
    }
  }, [filteredPlaces, selectedPlaceId]);

  const panToPlaceForDetail = useCallback((place: PlaceWithStats) => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToPlaceWithUiPadding(
      map,
      place.latitude,
      place.longitude,
      MAP_UI_PADDING_LANDING,
    );
  }, []);

  const focusPlaceOnMap = (place: PlaceWithStats) => {
    setSelectedPlaceId(place.id);
    panToPlaceForDetail(place);
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      try {
        const map = L.map('landing-map', {
          scrollWheelZoom: false, // Desabilitar scroll por defecto
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
        const icon = L.divIcon({
          className: '',
          html: buildPinHtml({
            color: baseColor,
            glyph: categoryGlyph(place.category),
            selected: isSelected,
            size,
          }),
          iconSize: [size, size + 12],
          iconAnchor: [Math.round(size / 2), Math.round(size + 6)],
          popupAnchor: [0, -Math.round(size + 6)],
        });

        const marker = L.marker([place.latitude, place.longitude], { icon })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedPlaceId(place.id);
            panToPlaceForDetail(place);
          })
          .addTo(mapRef.current!);

        markersRef.current.push({ marker, place });
      }
    });
  }, [filteredPlaces, selectedPlaceId, panToPlaceForDetail]);

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
        className='mx-4 mt-3 rounded-2xl border bg-white/70 px-6 py-3 shadow-sm backdrop-blur'
        style={{ borderColor: COLORS.border }}
      >
        <div className='mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
          <div className='min-w-0'>
            <h1
              className='truncate text-xl font-bold'
              style={{ color: COLORS.text }}
            >
              IrTranquilo
            </h1>
            <p className='text-xs' style={{ color: COLORS.textMuted }}>
              Lugares con información de accesibilidad
            </p>
          </div>

          <div className='flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-4'>
            <Button
              size='sm'
              variant='default'
              className='h-9 px-4'
              onClick={() => setShowAddPlaceModal(true)}
            >
              + Añadir Lugar
            </Button>
            <div className='flex items-center gap-2.5'>
              <span className='hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline'>
                {userDisplayName}
              </span>
              <Button size='sm' variant='outline' onClick={signOut}>
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className='px-6 py-10'
        style={{
          background: `linear-gradient(to bottom, ${COLORS.background}, white)`,
        }}
      >
        <div className='mx-auto max-w-4xl text-center'>
          {/* Badge */}
          <div
            className='mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2'
            style={{ backgroundColor: `${COLORS.primary}15` }}
          >
            <span
              className='text-xs font-semibold uppercase tracking-wide'
              style={{ color: COLORS.primary }}
            >
              Descubre • Evalúa • Comparte
            </span>
          </div>

          {/* Title */}
          <h2
            className='mb-3 text-2xl font-bold sm:text-3xl'
            style={{ color: COLORS.text }}
          >
            Descubre tu ciudad{' '}
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
          <p className='mb-6 text-base' style={{ color: COLORS.textMuted }}>
            Únete a la comunidad que está mapeando la inclusión. Encuentra
            espacios accesibles, califica tu experiencia y ayuda a otros a
            moverse con libertad.
          </p>

          {/* Search Bar */}
          <div className='mx-auto flex w-full max-w-2xl items-center gap-2'>
            <div className='relative z-2500 w-full'>
              <Input
                type='search'
                placeholder='Busca un lugar por nombre (Ej: Clínica Las Condes)'
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalSearch(v);
                  setSearch(v);
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
                    navigate(`/explore?search=${encodeURIComponent(search)}`);
                  }
                }}
                className='h-11 text-base'
              />

              {showSearchDropdown && searchSuggestions.length > 0 ? (
                <div className='absolute z-2600 mt-2 w-full max-h-72 overflow-y-auto rounded-md border bg-white shadow-md'>
                  {searchSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      className='block w-full px-3 py-2 text-left text-sm hover:bg-gray-50'
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
              ) : null}
            </div>
            <Button
              className='h-11 px-6'
              onClick={() =>
                navigate(`/explore?search=${encodeURIComponent(search)}`)
              }
            >
              Buscar
            </Button>
          </div>
        </div>
      </section>

      {/* Map Container with Margins */}
      <div
        className='relative px-4 py-4 h-[60vh] min-h-[420px] max-h-[720px]'
        style={{ backgroundColor: `${COLORS.border}40` }}
      >
        <div
          id='landing-map'
          className='w-full h-full rounded-lg overflow-hidden shadow-lg'
          style={{ pointerEvents: showFiltersModal ? 'none' : 'auto' }}
        />

        {/* Bloqueo del mapa en mobile cuando el sidebar está abierto */}
        {selectedPlaceData ? (
          <div className='absolute inset-0 z-1700 bg-black/20 sm:hidden pointer-events-auto' />
        ) : null}

        {selectedPlaceData ? (
          <div className='absolute inset-y-0 right-0 z-1800 flex max-h-full w-full justify-end pointer-events-none'>
            <div className='pointer-events-auto h-full max-h-full min-w-0'>
              <PlaceMapSidebar
                place={selectedPlaceData}
                onClose={() => setSelectedPlaceId(null)}
              />
            </div>
          </div>
        ) : null}

        {/* Filtros Button - Top Left */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className='absolute top-8 left-8 z-1500 flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-lg border'
          style={{
            backgroundColor: COLORS.card,
            color: COLORS.text,
            borderColor: COLORS.border,
            pointerEvents: 'auto',
          }}
        >
          <span>⚙️ Filtros</span>
          <span className='text-sm' style={{ color: COLORS.textMuted }}>
            ({Object.values(filters).filter((v) => v).length})
          </span>
        </button>

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
          <div className='grid grid-cols-4 gap-8 mb-12'>
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
                    onClick={() => navigate('/explore')}
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
            className='border-t pt-8 flex items-center justify-between text-sm'
            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
          >
            <p>&copy; 2024 IrTranquilo. Con ❤️ para una ciudad sin barreras.</p>
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
            {/* 1. Solo Recomendados */}
            <div className='space-y-2'>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.recommendedOnly}
                  onChange={() => toggleFilter('recommendedOnly')}
                  className='w-4 h-4 rounded border'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span
                  className='text-sm font-semibold'
                  style={{ color: COLORS.text }}
                >
                  ⭐ Solo recomendados (4.5+)
                </span>
              </label>
            </div>

            {/* 2. Categoría */}
            <div
              className='space-y-2 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                Categoría
              </p>
              <select
                value={category}
                onChange={(e) => {
                  setLocalCategory(e.target.value as PlaceCategory | 'all');
                  setCategory(e.target.value as PlaceCategory | 'all');
                }}
                className='w-full rounded-lg border px-3 py-2 text-sm'
                style={{
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 2px rgba(37, 99, 235, 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value='all'>Todas</option>
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {PLACE_CATEGORY_LABEL_ES[c]}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Accesibilidad - LLEGADA */}
            <div
              className='space-y-3 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                🚗 Llegada (Parking)
              </p>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.parking_accessible}
                  onChange={() => toggleFilter('parking_accessible')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Parking accesible
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.parking_near_entrance}
                  onChange={() => toggleFilter('parking_near_entrance')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Cerca de entrada
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.signage_clear}
                  onChange={() => toggleFilter('signage_clear')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Señalización clara
                </span>
              </label>
            </div>

            {/* 4. Accesibilidad - ENTRADA */}
            <div
              className='space-y-3 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                🚪 Entrada
              </p>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.step_free_access}
                  onChange={() => toggleFilter('step_free_access')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Sin escalones
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.ramp_available}
                  onChange={() => toggleFilter('ramp_available')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Rampa disponible
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.elevator_available}
                  onChange={() => toggleFilter('elevator_available')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Ascensor
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.entrance_width_ok}
                  onChange={() => toggleFilter('entrance_width_ok')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Ancho de entrada OK
                </span>
              </label>
            </div>

            {/* 5. Accesibilidad - INTERIOR */}
            <div
              className='space-y-3 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                🏢 Interior
              </p>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.accessible_bathroom}
                  onChange={() => toggleFilter('accessible_bathroom')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Baño accesible
                </span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.circulation_clear}
                  onChange={() => toggleFilter('circulation_clear')}
                  className='w-4 h-4 rounded'
                  style={{
                    borderColor: COLORS.border,
                    accentColor: COLORS.primary,
                  }}
                />
                <span className='text-sm' style={{ color: COLORS.text }}>
                  Circulación clara
                </span>
              </label>
            </div>

            {/* 6. Rating Mínimo */}
            <div
              className='space-y-2 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                ⭐ Rating mínimo
              </p>
              <select
                value={filters.minRating ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseFloat(e.target.value)
                    : null;
                  setFilterValue('minRating', val);
                }}
                className='w-full rounded-lg border px-3 py-2 text-sm'
                style={{
                  borderColor: COLORS.border,
                  color: COLORS.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 2px rgba(37, 99, 235, 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value=''>Cualquiera</option>
                <option value='1'>1.0+</option>
                <option value='2'>2.0+</option>
                <option value='3'>3.0+</option>
                <option value='4'>4.0+</option>
                <option value='4.5'>4.5+</option>
              </select>
            </div>
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
              onClick={() => setShowFiltersModal(false)}
              className='w-full rounded-lg px-4 py-2 text-sm font-semibold text-white'
              style={{ backgroundColor: COLORS.primary }}
            >
              Ver resultados
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
