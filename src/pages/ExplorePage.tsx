import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { PlaceMapSidebar } from '../components/map/PlaceMapSidebar';
import { CATEGORIES, getCategoryMeta, type PlaceCategory } from '../types';
import { ACCESSIBILITY_FIELD_GROUPS } from '../types/reviewAccessibility';
import { COLORS, getPinColor } from '../styles/colors';
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../lib/mapDefaults';
import { fixLeafletDefaultIcons } from '../lib/leafletIcon';
import { buildPinHtml, categoryGlyph } from '../lib/pins';
import type { PlaceWithStats } from '../context/placesContext';
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
  const [showMobileList, setShowMobileList] = useState(false);

  const panToPlaceForDetail = useCallback((place: PlaceWithStats) => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToPlaceWithUiPadding(
      map,
      place.latitude,
      place.longitude,
      MAP_UI_PADDING_EXPLORE,
    );
  }, []);

  useEffect(() => {
    if (search) setSearch(search);
  }, [search, setSearch]);

  useEffect(() => {
    setCategory(category);
  }, [category, setCategory]);

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
        setTimeout(() => map.invalidateSize(), 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  }, []);

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

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const isSelected = selectedPlace === place.id;
        const baseColor = getPinColor(place.avgRating);
        fixLeafletDefaultIcons();
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
            setSelectedPlace(place.id);
            setShowMobileList(false);
            panToPlaceForDetail(place);
          })
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      }
    });
  }, [filteredPlaces, selectedPlace, panToPlaceForDetail]);

  const selectedPlaceData = useMemo(() => {
    if (selectedPlace == null) return undefined;
    return filteredPlaces.find((p) => p.id === selectedPlace);
  }, [selectedPlace, filteredPlaces]);

  useEffect(() => {
    if (selectedPlace == null) return;
    if (!filteredPlaces.some((p) => p.id === selectedPlace)) {
      queueMicrotask(() => setSelectedPlace(null));
    }
  }, [filteredPlaces, selectedPlace]);

  return (
    <div className='flex h-screen bg-white overflow-hidden'>
      {/* Sidebar desktop — oculto en móvil */}
      <div
        className='hidden md:flex w-96 border-r overflow-hidden flex-col shrink-0'
        style={{ borderColor: COLORS.border }}
      >
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
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          />
        </div>

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
                  ⭐ {place.avgRating.toFixed(1)} · {place.reviewCount} reseñas
                </p>
              </button>
            ))
          )}
        </div>

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

      {/* Map Container */}
      <div className='flex-1 relative'>
        <div
          id='explore-map'
          className='w-full h-full'
          style={{ pointerEvents: showFiltersModal ? 'none' : 'auto' }}
        />

        {/* Botones flotantes sobre el mapa */}
        <div className='absolute top-4 left-4 z-[1500] flex gap-2 pointer-events-auto'>
          {/* Volver — solo móvil */}
          <button
            onClick={() => navigate('/')}
            className='md:hidden flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg border'
            style={{
              backgroundColor: COLORS.card,
              color: COLORS.text,
              borderColor: COLORS.border,
            }}
          >
            ←
          </button>

          <button
            onClick={() => setShowFiltersModal(true)}
            className='flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg border'
            style={{
              backgroundColor: COLORS.card,
              color: COLORS.text,
              borderColor: COLORS.border,
            }}
          >
            ⚙️ Filtros
          </button>
        </div>

        {/* Botón lista — solo móvil, abajo */}
        <div className='md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1500] flex gap-3 pointer-events-auto'>
          <button
            onClick={() => setShowMobileList(true)}
            className='flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl'
            style={{ backgroundColor: COLORS.primary }}
          >
            📋 Ver lista ({filteredPlaces.length})
          </button>
          <button
            onClick={() => navigate('/places/new')}
            className='flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-xl'
            style={{ backgroundColor: COLORS.primaryDark ?? COLORS.primary }}
          >
            + Lugar
          </button>
        </div>

        {/* Detail sidebar — desktop */}
        {selectedPlaceData ? (
          <div className='hidden md:flex absolute inset-y-0 right-0 z-[1800] w-full justify-end pointer-events-none'>
            <div className='pointer-events-auto h-full max-h-full min-w-0'>
              <PlaceMapSidebar
                place={selectedPlaceData}
                onClose={() => setSelectedPlace(null)}
              />
            </div>
          </div>
        ) : null}

        {/* Detail bottom sheet — móvil */}
        {selectedPlaceData ? (
          <div className='md:hidden absolute inset-x-0 bottom-0 z-[1800] pointer-events-auto'>
            <div
              className='rounded-t-2xl shadow-2xl border-t border-neutral-200 bg-white animate-in slide-in-from-bottom-4 duration-200'
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div className='flex items-center justify-between px-4 py-3 border-b border-neutral-100'>
                <div>
                  <p className='font-semibold text-neutral-900 text-sm'>
                    {selectedPlaceData.name}
                  </p>
                  <p className='text-xs text-neutral-500'>
                    ⭐ {selectedPlaceData.avgRating.toFixed(1)} ·{' '}
                    {selectedPlaceData.reviewCount} reseñas
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => navigate(`/lugares/${selectedPlaceData.id}`)}
                    className='rounded-full px-4 py-2 text-sm font-semibold text-white'
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Ver detalle
                  </button>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className='rounded-full w-9 h-9 flex items-center justify-center border border-neutral-200 text-neutral-500'
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className='px-4 py-3 text-sm text-neutral-600'>
                <p>{selectedPlaceData.address}</p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlaceData.latitude},${selectedPlaceData.longitude}`}
                  target='_blank'
                  rel='noreferrer'
                  className='mt-2 inline-flex items-center gap-1.5 text-sm font-medium'
                  style={{ color: COLORS.primary }}
                >
                  🧭 Cómo llegar
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom sheet lista — móvil */}
      {showMobileList && (
        <div className='md:hidden fixed inset-0 z-[2000] flex flex-col'>
          <div
            className='absolute inset-0 bg-black/40'
            onClick={() => setShowMobileList(false)}
          />
          <div className='relative mt-auto bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh]'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0'>
              <div>
                <h2 className='font-bold text-neutral-900'>Lugares</h2>
                <p className='text-xs text-neutral-500'>
                  {filteredPlaces.length} resultados
                </p>
              </div>
              <button
                onClick={() => setShowMobileList(false)}
                className='rounded-full w-9 h-9 flex items-center justify-center border border-neutral-200 text-neutral-500'
              >
                ✕
              </button>
            </div>

            <div className='px-4 py-2 shrink-0 border-b border-neutral-100'>
              <input
                type='text'
                placeholder='Buscar lugares...'
                value={search}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setSearch(e.target.value);
                }}
                className='w-full rounded-lg border px-3 py-2.5 text-sm'
                style={{ borderColor: COLORS.border }}
              />
            </div>

            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              {filteredPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => {
                    setSelectedPlace(place.id);
                    panToPlaceForDetail(place);
                    setShowMobileList(false);
                  }}
                  className='w-full text-left p-3 rounded-xl border transition-all min-h-[64px]'
                  style={{
                    borderColor:
                      selectedPlace === place.id
                        ? COLORS.primary
                        : COLORS.border,
                    backgroundColor:
                      selectedPlace === place.id
                        ? `${COLORS.primary}0A`
                        : 'transparent',
                  }}
                >
                  <h3
                    className='font-semibold text-sm'
                    style={{ color: COLORS.text }}
                  >
                    {place.name}
                  </h3>
                  <p
                    className='text-xs mt-0.5'
                    style={{ color: COLORS.textMuted }}
                  >
                    {getCategoryMeta(place.category).label} · ⭐{' '}
                    {place.avgRating.toFixed(1)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters Dialog */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent
          hideClose
          className='fixed left-0 top-0 z-[9001] flex h-full max-h-dvh w-full max-w-[min(24rem,100vw)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border border-b-0 border-l-0 border-t-0 p-0 shadow-xl sm:rounded-r-xl sm:border-r'
          style={{ backgroundColor: COLORS.card }}
        >
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

          <div className='flex-1 overflow-y-auto p-6 space-y-5'>
            <div className='space-y-2'>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={filters.recommendedOnly}
                  onChange={() => toggleFilter('recommendedOnly')}
                  className='w-5 h-5 rounded border'
                  style={{ accentColor: COLORS.primary }}
                />
                <span
                  className='text-sm font-semibold'
                  style={{ color: COLORS.text }}
                >
                  ⭐ Solo recomendados (4.5+)
                </span>
              </label>
            </div>

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
                className='w-full rounded-lg border px-3 py-2.5 text-sm'
                style={{ borderColor: COLORS.border, color: COLORS.text }}
              >
                <option value='all'>Todas</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {ACCESSIBILITY_FIELD_GROUPS.map((group) => {
              const sectionTitle =
                group.title === 'LLEGADA'
                  ? '🚗 Llegada'
                  : group.title === 'ENTRADA'
                    ? '🚪 Entrada'
                    : '🏢 Interior';
              return (
                <div
                  key={group.title}
                  className='space-y-3 pt-3 border-t'
                  style={{ borderColor: COLORS.border }}
                >
                  <p
                    className='text-xs font-semibold uppercase'
                    style={{ color: COLORS.textMuted }}
                  >
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
                        className='h-5 w-5 rounded'
                        style={{ accentColor: COLORS.primary }}
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
                onChange={(e) =>
                  setFilterValue(
                    'minRating',
                    e.target.value ? parseFloat(e.target.value) : null,
                  )
                }
                className='w-full rounded-lg border px-3 py-2.5 text-sm'
                style={{ borderColor: COLORS.border, color: COLORS.text }}
              >
                <option value=''>Cualquiera</option>
                {['1', '2', '3', '4', '4.5'].map((v) => (
                  <option key={v} value={v}>
                    {v}+
                  </option>
                ))}
              </select>
            </div>

            <div
              className='space-y-2 pt-3 border-t'
              style={{ borderColor: COLORS.border }}
            >
              <p
                className='text-xs font-semibold uppercase'
                style={{ color: COLORS.textMuted }}
              >
                🎯 Leyenda
              </p>
              {[
                { color: COLORS.success, label: 'Alta (4.5+)' },
                { color: COLORS.warning, label: 'Media (3.5-4.4)' },
                { color: COLORS.danger, label: 'Baja (<3.5)' },
              ].map(({ color, label }) => (
                <div key={label} className='flex items-center gap-2'>
                  <div
                    className='w-5 h-5 rounded-full shrink-0'
                    style={{ backgroundColor: color }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className='border-t px-6 py-4 space-y-3'
            style={{ borderColor: COLORS.border }}
          >
            <button
              onClick={resetFilters}
              className='w-full rounded-lg border px-4 py-3 text-sm font-semibold min-h-[48px]'
              style={{ borderColor: COLORS.border, color: COLORS.text }}
            >
              Limpiar filtros
            </button>
            <button
              onClick={() => setShowFiltersModal(false)}
              className='w-full rounded-lg px-4 py-3 text-sm font-semibold text-white min-h-[48px]'
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
