import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { PlaceMapSidebar } from '../components/map/PlaceMapSidebar';
import { CATEGORIES, getCategoryMeta, type PlaceCategory } from '../types';
import { COLORS, getPinColor } from '../styles/colors';
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../lib/mapDefaults';
import { fixLeafletDefaultIcons } from '../lib/leafletIcon'
import { buildPinHtml, categoryGlyph } from '../lib/pins'
import type { PlaceWithStats } from '../context/placesContext'
import {
  fitMapToPlaceWithUiPadding,
  MAP_UI_PADDING_EXPLORE,
} from '../lib/mapPlaceFocus';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth();
  const {
    filteredPlaces,
    setSearch,
    setCategory,
    filters,
    toggleFilter,
    resetFilters,
    setFilterValue,
  } = usePlaces();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [search, setLocalSearch] = useState(searchParams.get('search') || '');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>(
    (searchParams.get('category') as PlaceCategory | 'all') || 'all',
  );
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const panToPlaceForDetail = useCallback((place: PlaceWithStats) => {
    const map = mapRef.current
    if (!map) return
    fitMapToPlaceWithUiPadding(
      map,
      place.latitude,
      place.longitude,
      MAP_UI_PADDING_EXPLORE,
    )
  }, [])

  // Initialize search from URL
  useEffect(() => {
    if (search) {
      setSearch(search);
    }
  }, [search, setSearch]);

  // Initialize category filter from URL
  useEffect(() => {
    setCategory(category);
  }, [category, setCategory]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      try {
        const map = L.map('explore-map').setView(
          SANTIAGO_CENTER,
          SANTIAGO_ZOOM,
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        // Force Leaflet to recalculate size after render
        setTimeout(() => map.invalidateSize(), 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }

    return () => {
      // Cleanup map on unmount
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

  // Update markers when places change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    filteredPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const isSelected = selectedPlace === place.id;
        const baseColor = getPinColor(place.avgRating);
        fixLeafletDefaultIcons()
        const size = isSelected ? 28 : 24
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
        })

        const marker = L.marker([place.latitude, place.longitude], { icon })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            setSelectedPlace(place.id)
            panToPlaceForDetail(place)
          })
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      }
    });
  }, [filteredPlaces, selectedPlace, panToPlaceForDetail]);

  const selectedPlaceData = useMemo(() => {
    if (selectedPlace == null) return undefined
    return filteredPlaces.find((p) => p.id === selectedPlace)
  }, [selectedPlace, filteredPlaces])

  useEffect(() => {
    if (selectedPlace == null) return
    if (!filteredPlaces.some((p) => p.id === selectedPlace)) {
      queueMicrotask(() => setSelectedPlace(null))
    }
  }, [filteredPlaces, selectedPlace])

  return (
    <div className='flex h-screen bg-white'>
      {/* Sidebar */}
      <div
        className='w-96 border-r overflow-hidden flex flex-col'
        style={{ borderColor: COLORS.border }}
      >
        {/* Header */}
        <div className='border-b p-4' style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => navigate('/')}
            className='mb-4 text-sm font-semibold'
            style={{ color: COLORS.primary }}
          >
            ← Volver
          </button>
          <h2 className='text-xl font-bold' style={{ color: COLORS.text }}>
            IrTranquilo
          </h2>
        </div>

        {/* Search */}
        <div
          className='border-b p-4 space-y-3'
          style={{ borderColor: COLORS.border }}
        >
          <input
            type='text'
            placeholder='Buscar lugares...'
            value={search}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setSearch(e.target.value);
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
          />
        </div>

        {/* Results */}
        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          {filteredPlaces.length === 0 ? (
            <p className='text-center py-8' style={{ color: COLORS.textMuted }}>
              No hay lugares que coincidan
            </p>
          ) : (
            filteredPlaces.map((place) => (
              <button
                key={place.id}
                onClick={() => {
                  setSelectedPlace(place.id);
                  panToPlaceForDetail(place);
                }}
                className='w-full text-left p-3 rounded-lg border transition-all'
                style={{
                  borderColor:
                    selectedPlace === place.id ? COLORS.primary : COLORS.border,
                  backgroundColor:
                    selectedPlace === place.id
                      ? `${COLORS.primary}0A`
                      : 'transparent',
                }}
              >
                <h3 className='font-semibold' style={{ color: COLORS.text }}>
                  {place.name}
                </h3>
                <p className='text-sm' style={{ color: COLORS.textMuted }}>
                  {getCategoryMeta(place.category).label}
                </p>
                <p className='text-xs mt-1' style={{ color: COLORS.textMuted }}>
                  ⭐ {place.avgRating.toFixed(1)} • {place.reviewCount} reseñas
                </p>
              </button>
            ))
          )}
        </div>

        {/* Add Place Button */}
        <div className='border-t p-4' style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => navigate('/places/new')}
            className='w-full rounded-lg py-3 font-semibold text-white'
            style={{ backgroundColor: COLORS.primary }}
          >
            + Agregar lugar
          </button>
        </div>
      </div>

      {/* Map Container - relative parent for overlays */}
      <div className='flex-1 relative'>
        <div
          id='explore-map'
          className='w-full h-full'
          style={{ pointerEvents: showFiltersModal ? 'none' : 'auto' }}
        />

        {/* Filtros Button - Top Left (outside map) */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className='absolute z-1500 flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-xl border'
          style={{
            backgroundColor: COLORS.card,
            color: COLORS.text,
            borderColor: COLORS.border,
            top: '2rem',
            left: '2rem',
            zIndex: 1500,
            pointerEvents: 'auto',
          }}
        >
          <span>⚙️ Filtros</span>
        </button>

        {selectedPlaceData ? (
          <div className='absolute inset-y-0 right-0 z-1800 flex w-full justify-end pointer-events-none'>
            <div className='pointer-events-auto h-full max-h-full min-w-0'>
              <PlaceMapSidebar
                place={selectedPlaceData}
                onClose={() => setSelectedPlace(null)}
              />
            </div>
          </div>
        ) : null}
      </div>

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
                  📁 Categoría
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
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
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
                  🚗 Llegada
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
                    Parking accesible ♿
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
                    checked={filters.mechanical_stairs}
                    onChange={() => toggleFilter('mechanical_stairs')}
                    className='w-4 h-4 rounded'
                    style={{
                      borderColor: COLORS.border,
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    Escalera mecánica
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
                    checked={filters.wide_entrance}
                    onChange={() => toggleFilter('wide_entrance')}
                    className='w-4 h-4 rounded'
                    style={{
                      borderColor: COLORS.border,
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    Entrada ancha para silla de ruedas
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
                    Circulación interior amplia
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

              {/* 7. Leyenda */}
              <div
                className='space-y-2 pt-3 border-t'
                style={{ borderColor: COLORS.border }}
              >
                <p
                  className='text-xs font-semibold uppercase'
                  style={{ color: COLORS.textMuted }}
                >
                  🎯 Leyenda de Pines
                </p>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-5 h-5 rounded-full'
                      style={{ backgroundColor: COLORS.success }}
                    ></div>
                    <span className='text-sm' style={{ color: COLORS.text }}>
                      Alta (4.5+)
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-5 h-5 rounded-full'
                      style={{ backgroundColor: COLORS.warning }}
                    ></div>
                    <span className='text-sm' style={{ color: COLORS.text }}>
                      Media (3.5-4.4)
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-5 h-5 rounded-full'
                      style={{ backgroundColor: COLORS.danger }}
                    ></div>
                    <span className='text-sm' style={{ color: COLORS.text }}>
                      Baja (&lt;3.5)
                    </span>
                  </div>
                </div>
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
    </div>
  );
}
