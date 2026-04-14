import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import type { PlaceCategory } from '../types';
import { COLORS, getPinColor } from '../styles/colors';

export function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { filteredPlaces, setSearch, setCategory, filters, toggleFilter, resetFilters, setFilterValue } = usePlaces();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ marker: L.CircleMarker; place: any }[]>([]);
  const [search, setLocalSearch] = useState('');
  const [category, setLocalCategory] = useState<PlaceCategory | 'all'>('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      try {
        const map = L.map('landing-map', {
          scrollWheelZoom: false, // Desabilitar scroll por defecto
        }).setView([-33.8688, -51.5305], 13);

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

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    filteredPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const pinColor = getPinColor(place.avgRating);
        const marker = L.circleMarker([place.latitude, place.longitude], {
          radius: 6,
          fillColor: pinColor,
          color: '#000',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6,
        })
          .bindPopup(place.name)
          .addTo(mapRef.current!);

        markersRef.current.push({ marker, place });
      }
    });
  }, [filteredPlaces]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className='flex flex-col min-h-screen' style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <header className='border-b px-6 py-4' style={{ borderColor: COLORS.border }}>
        <div className='mx-auto flex max-w-7xl items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold' style={{ color: COLORS.text }}>IrTranquilo</h1>
            <p className='text-sm' style={{ color: COLORS.textMuted }}>
              Lugares con información de accesibilidad
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/places/new')}
              className='rounded-lg px-4 py-2 text-sm font-semibold text-white'
              style={{ backgroundColor: COLORS.primary }}
            >
              + Añadir Lugar
            </button>
            <div className='relative'>
              <button className='flex items-center gap-2' style={{ color: COLORS.text }}>
                <span>{user?.email}</span>
                <div className='h-8 w-8 rounded-full' style={{ backgroundColor: `${COLORS.primary}20` }} />
              </button>
              <button
                onClick={signOut}
                className='absolute right-0 top-full mt-2 hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm'
                style={{ backgroundColor: COLORS.background, color: COLORS.text, borderColor: COLORS.border }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='px-6 py-12' style={{ background: `linear-gradient(to bottom, ${COLORS.background}, white)` }}>
        <div className='mx-auto max-w-4xl text-center'>
          {/* Badge */}
          <div className='mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2' style={{ backgroundColor: `${COLORS.primary}15` }}>
            <span className='text-xs font-semibold uppercase tracking-wide' style={{ color: COLORS.primary }}>
              Descubre • Evalúa • Comparte
            </span>
          </div>

          {/* Title */}
          <h2 className='mb-4 text-4xl font-bold' style={{ color: COLORS.text }}>
            Descubre tu ciudad{' '}
            <span style={{
              background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.success})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              sin barreras
            </span>
          </h2>

          {/* Description */}
          <p className='mb-8 text-lg' style={{ color: COLORS.textMuted }}>
            Únete a la comunidad que está mapeando la inclusión. Encuentra
            espacios accesibles, califica tu experiencia y ayuda a otros a
            moverse con libertad.
          </p>

          {/* Search Bar */}
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='¿A dónde quieres ir hoy? (Ej: Café en Santiago)'
              value={search}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setSearch(e.target.value);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  navigate(`/explore?search=${encodeURIComponent(search)}`);
                }
              }}
              className='flex-1 rounded-lg border px-6 py-4 text-lg'
              style={{
                borderColor: COLORS.border,
                color: COLORS.text,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(37, 99, 235, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={() => navigate(`/explore?search=${encodeURIComponent(search)}`)}
              className='rounded-lg px-8 py-4 font-semibold text-white'
              style={{ backgroundColor: COLORS.primary }}
            >
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* Map Container with Margins */}
      <div className='h-96 relative px-4 py-4' style={{ backgroundColor: `${COLORS.border}40` }}>
        <div id='landing-map' className='w-full h-full rounded-lg overflow-hidden shadow-lg' />

        {/* Filtros Button - Top Left */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className='absolute top-8 left-8 z-10 flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-lg border'
          style={{
            backgroundColor: COLORS.card,
            color: COLORS.text,
            borderColor: COLORS.border,
          }}
        >
          <span>⚙️ Filtros</span>
          <span className='text-sm' style={{ color: COLORS.textMuted }}>({Object.values(filters).filter(v => v).length})</span>
        </button>

        {/* Resultado Info - Bottom Right */}
        <div className='absolute bottom-8 right-8 z-10 rounded-lg px-4 py-3 shadow-lg border'
          style={{
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
          }}>
          <p className='text-sm font-semibold' style={{ color: COLORS.text }}>
            {filteredPlaces.length} lugares encontrados
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <section className='px-6 py-16' style={{ backgroundColor: COLORS.card }}>
        <div className='mx-auto max-w-4xl text-center'>
          <h3 className='mb-4 text-4xl font-bold' style={{ color: COLORS.primary }}>
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
      <footer className='border-t px-6 py-12 mt-auto' style={{ backgroundColor: `${COLORS.border}20`, borderColor: COLORS.border }}>
        <div className='mx-auto max-w-7xl'>
          {/* Footer Content */}
          <div className='grid grid-cols-4 gap-8 mb-12'>
            {/* Brand */}
            <div>
              <h4 className='text-lg font-bold mb-2' style={{ color: COLORS.text }}>IrTranquilo</h4>
              <p className='text-sm' style={{ color: COLORS.textMuted }}>
                Un mundo más accesible, un lugar a la vez.
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>Plataforma</h5>
              <ul className='space-y-2 text-sm' style={{ color: COLORS.textMuted }}>
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
                  <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                    Cómo contribuir
                  </a>
                </li>
                <li>
                  <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                    Sobre Accesibilidad
                  </a>
                </li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>Soporte</h5>
              <ul className='space-y-2 text-sm' style={{ color: COLORS.textMuted }}>
                <li>
                  <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                    Preguntas Frecuentes
                  </a>
                </li>
                <li>
                  <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                    Términos de uso
                  </a>
                </li>
                <li>
                  <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                    Privacidad
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h5 className='font-bold mb-4' style={{ color: COLORS.primary }}>Mantente al día</h5>
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
                <button className='w-full rounded-lg px-3 py-2 text-sm font-semibold text-white'
                  style={{ backgroundColor: COLORS.primary }}>
                  Suscribirse
                </button>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className='border-t pt-8 flex items-center justify-between text-sm' style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>
            <p>&copy; 2024 IrTranquilo. Con ❤️ para una ciudad sin barreras.</p>
            <div className='flex gap-4'>
              <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                Twitter
              </a>
              <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                Instagram
              </a>
              <a href='#' style={{ color: COLORS.textMuted }} className='hover:font-semibold'>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Filtros Modal - Drawer */}
      {showFiltersModal && (
        <div className='fixed inset-0 z-50 flex'>
          {/* Overlay */}
          <div
            className='flex-1 bg-black/20'
            onClick={() => setShowFiltersModal(false)}
          />

          {/* Drawer Panel */}
          <div className='w-96 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-left-96'
            style={{ backgroundColor: COLORS.card }}>
            {/* Header */}
            <div className='border-b px-6 py-4 flex items-center justify-between' style={{ borderColor: COLORS.border }}>
              <h2 className='text-lg font-bold' style={{ color: COLORS.text }}>Filtros y Leyenda</h2>
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
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm font-semibold' style={{ color: COLORS.text }}>
                    ⭐ Solo recomendados (4.5+)
                  </span>
                </label>
              </div>

              {/* 2. Categoría */}
              <div className='space-y-2 pt-3 border-t' style={{ borderColor: COLORS.border }}>
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
                  <option value='restaurant'>Restaurante</option>
                  <option value='cafe'>Café</option>
                  <option value='mall'>Centro comercial</option>
                  <option value='park'>Parque</option>
                  <option value='clinic'>Clínica</option>
                  <option value='other'>Otro</option>
                </select>
              </div>

              {/* 3. Accesibilidad - LLEGADA */}
              <div className='space-y-3 pt-3 border-t' style={{ borderColor: COLORS.border }}>
                <p className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>
                  🚗 Llegada (Parking)
                </p>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.parking_available}
                    onChange={() => toggleFilter('parking_available')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Parking disponible</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.parking_accessible}
                    onChange={() => toggleFilter('parking_accessible')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Parking accesible</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.parking_near_entrance}
                    onChange={() => toggleFilter('parking_near_entrance')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Cerca de entrada</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.signage_clear}
                    onChange={() => toggleFilter('signage_clear')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Señalización clara</span>
                </label>
              </div>

              {/* 4. Accesibilidad - ENTRADA */}
              <div className='space-y-3 pt-3 border-t' style={{ borderColor: COLORS.border }}>
                <p className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>
                  🚪 Entrada
                </p>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.step_free_access}
                    onChange={() => toggleFilter('step_free_access')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Sin escalones</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.ramp_available}
                    onChange={() => toggleFilter('ramp_available')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Rampa disponible</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.elevator_available}
                    onChange={() => toggleFilter('elevator_available')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Ascensor</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.entrance_width_ok}
                    onChange={() => toggleFilter('entrance_width_ok')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Ancho de entrada OK</span>
                </label>
              </div>

              {/* 5. Accesibilidad - INTERIOR */}
              <div className='space-y-3 pt-3 border-t' style={{ borderColor: COLORS.border }}>
                <p className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>
                  🏢 Interior
                </p>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.interior_spacious}
                    onChange={() => toggleFilter('interior_spacious')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Espacioso</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.wheelchair_table_access}
                    onChange={() => toggleFilter('wheelchair_table_access')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Acceso a mesas</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.accessible_bathroom}
                    onChange={() => toggleFilter('accessible_bathroom')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Baño accesible</span>
                </label>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={filters.circulation_clear}
                    onChange={() => toggleFilter('circulation_clear')}
                    className='w-4 h-4 rounded'
                    style={{ borderColor: COLORS.border, accentColor: COLORS.primary }}
                  />
                  <span className='text-sm' style={{ color: COLORS.text }}>Circulación clara</span>
                </label>
              </div>

              {/* 6. Rating Mínimo */}
              <div className='space-y-2 pt-3 border-t' style={{ borderColor: COLORS.border }}>
                <p className='text-xs font-semibold uppercase' style={{ color: COLORS.textMuted }}>
                  ⭐ Rating mínimo
                </p>
                <select
                  value={filters.minRating ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
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
            <div className='border-t px-6 py-4 space-y-3' style={{ borderColor: COLORS.border }}>
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
        </div>
      )}
    </div>
  );
}
