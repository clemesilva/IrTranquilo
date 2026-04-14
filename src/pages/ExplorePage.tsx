import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { PlaceCard } from '../components/PlaceCard';
import type { PlaceCategory } from '../types';
import { COLORS, getPinColor } from '../styles/colors';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth();
  const { allPlaces, filteredPlaces, setSearch, setCategory } = usePlaces();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [search, setLocalSearch] = useState(searchParams.get('search') || '');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>(
    (searchParams.get('category') as PlaceCategory | 'all') || 'all',
  );
  const [showFilters, setShowFilters] = useState(false);

  // Initialize search from URL
  useEffect(() => {
    if (search) {
      setSearch(search);
    }
  }, [search]);

  // Initialize category filter from URL
  useEffect(() => {
    setCategory(category);
  }, [category]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      try {
        const map = L.map('explore-map').setView([-33.8688, -51.5305], 12);

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
      <div className='w-96 border-r overflow-hidden flex flex-col' style={{ borderColor: COLORS.border }}>
        {/* Header */}
        <div className='border-b p-4' style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => navigate('/')}
            className='mb-4 text-sm font-semibold'
            style={{ color: COLORS.primary }}
          >
            ← Volver
          </button>
          <h2 className='text-xl font-bold' style={{ color: COLORS.text }}>IrTranquilo</h2>
        </div>

        {/* Search */}
        <div className='border-b p-4 space-y-3' style={{ borderColor: COLORS.border }}>
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

          <button
            onClick={() => setShowFilters(!showFilters)}
            className='flex items-center gap-2 text-sm font-semibold'
            style={{ color: COLORS.textMuted }}
          >
            <span>⚙️ Filtros</span>
          </button>

          {showFilters && (
            <div className='space-y-2 pt-2 border-t' style={{ borderColor: COLORS.border }}>
              <p className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>
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
                <option value='cafe'>Café</option>
                <option value='restaurant'>Restaurante</option>
                <option value='park'>Parque</option>
                <option value='clinic'>Clínica</option>
                <option value='shopping'>Centro comercial</option>
              </select>
            </div>
          )}
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
                  borderColor: selectedPlace === place.id ? COLORS.primary : COLORS.border,
                  backgroundColor: selectedPlace === place.id ? `${COLORS.primary}0A` : 'transparent',
                }}
              >
                <h3 className='font-semibold' style={{ color: COLORS.text }}>{place.name}</h3>
                <p className='text-sm' style={{ color: COLORS.textMuted }}>{place.category}</p>
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

      {/* Map */}
      <div className='flex-1 relative'>
        <div id='explore-map' className='w-full h-full' />

        {/* Selected Place Card */}
        {selectedPlaceData && (
          <div className='absolute bottom-6 right-6 w-80 rounded-lg shadow-lg border p-4 max-h-96 overflow-y-auto'
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
            }}>
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
    </div>
  );
}
