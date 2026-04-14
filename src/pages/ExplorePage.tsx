import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { PlaceCard } from '../components/PlaceCard';
import type { PlaceCategory } from '../types';
import { COLORS, getPinColor } from '../styles/colors';
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../lib/mapDefaults';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth();
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
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [search, setLocalSearch] = useState(searchParams.get('search') || '');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>(
    (searchParams.get('category') as PlaceCategory | 'all') || 'all',
  );
  const [showFiltersModal, setShowFiltersModal] = useState(false);

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
        const pinColor = getPinColor(place.avgRating);
        const marker = L.circleMarker([place.latitude, place.longitude], {
          radius: isSelected ? 10 : 6,
          fillColor: pinColor,
          color: '#000',
          weight: isSelected ? 2 : 1,
          opacity: 0.8,
          fillOpacity: isSelected ? 0.8 : 0.6,
        })
          .bindPopup(place.name)
          .on('click', () => setSelectedPlace(place.id))
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      }
    });
  }, [filteredPlaces, selectedPlace]);

  const selectedPlaceData = allPlaces.find((p) => p.id === selectedPlace);

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
                  if (place.latitude && place.longitude) {
                    mapRef.current?.setView(
                      [place.latitude, place.longitude],
                      16,
                    );
                  }
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
                  {place.category}
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
          className='absolute z-[1500] flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-xl border'
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

        {/* Selected Place Card */}
        {selectedPlaceData && (
          <div
            className='absolute bottom-6 right-6 w-80 rounded-lg shadow-lg border p-4 max-h-96 overflow-y-auto'
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              pointerEvents: 'auto',
              zIndex: 9998,
            }}
          >
            <button
              onClick={() => setSelectedPlace(null)}
              className='absolute top-2 right-2'
              style={{ color: COLORS.textLight }}
            >
              ✕
            </button>
            <PlaceCard place={selectedPlaceData} />
          </div>
        )}
      </div>

      {/* Filtros Modal - Drawer */}
      {showFiltersModal && (
        <div className='fixed inset-0 z-[2000] flex'>
          {/* Drawer Panel (izquierda) */}
          <div
            className='w-96 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-left-96'
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
                  <option value='restaurant'>Restaurante</option>
                  <option value='cafe'>Café</option>
                  <option value='mall'>Centro comercial</option>
                  <option value='park'>Parque</option>
                  <option value='clinic'>Clínica</option>
                  <option value='other'>Otro</option>
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
                    checked={filters.parking_available}
                    onChange={() => toggleFilter('parking_available')}
                    className='w-4 h-4 rounded'
                    style={{
                      borderColor: COLORS.border,
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    Parking disponible
                  </span>
                </label>
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
                    checked={filters.interior_spacious}
                    onChange={() => toggleFilter('interior_spacious')}
                    className='w-4 h-4 rounded'
                    style={{
                      borderColor: COLORS.border,
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    Espacioso
                  </span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.wheelchair_table_access}
                    onChange={() => toggleFilter('wheelchair_table_access')}
                    className='w-4 h-4 rounded'
                    style={{
                      borderColor: COLORS.border,
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    Acceso a mesas
                  </span>
                </label>
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
          </div>

          {/* Overlay (resto de la pantalla) */}
          <div
            className='flex-1 bg-black/20'
            onClick={() => setShowFiltersModal(false)}
          />
        </div>
      )}
    </div>
  );
}
