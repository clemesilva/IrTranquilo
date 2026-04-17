import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Button } from '@/components/ui/button'
import type { PlaceWithStats } from '../../context/placesContext'
import { usePlaces } from '../../context/usePlaces'
import { fixLeafletDefaultIcons } from '../../lib/leafletIcon'
import { bandLabelEs } from '../../lib/rating'
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../../lib/mapDefaults'
import { buildPinHtml, categoryGlyph } from '../../lib/pins'
import { getCategoryMeta } from '../../types/place'

fixLeafletDefaultIcons()

function FitHighlight({
  places,
  highlightId,
  draft,
}: {
  places: PlaceWithStats[]
  highlightId?: number
  draft?: [number, number]
}) {
  const map = useMap()

  useEffect(() => {
    if (draft) {
      map.setView(draft, 16, { animate: true })
      return
    }
    if (highlightId == null) {
      if (places.length === 0) return
      const lats = places.map((p) => p.latitude)
      const lngs = places.map((p) => p.longitude)
      const south = Math.min(...lats)
      const north = Math.max(...lats)
      const west = Math.min(...lngs)
      const east = Math.max(...lngs)
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [40, 40], maxZoom: 14 },
      )
      return
    }
    const p = places.find((x) => x.id === highlightId)
    if (p) {
      map.setView([p.latitude, p.longitude], 16, { animate: true })
    }
  }, [map, places, highlightId, draft])

  return null
}

export function PlacesMap({ highlightId }: { highlightId?: number }) {
  const { filteredPlaces } = usePlaces()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const isCreate = location.pathname.endsWith('/places/new')
  const draftLat = searchParams.get('draftLat')
  const draftLng = searchParams.get('draftLng')
  const draft =
    isCreate && draftLat && draftLng
      ? ([Number(draftLat), Number(draftLng)] as [number, number])
      : undefined

  const pinColor = (band: PlaceWithStats['band']) => {
    switch (band) {
      case 'recommended':
        return '#22C55E'
      case 'acceptable':
        return '#F59E0B'
      case 'not_recommended':
        return '#EF4444'
    }
  }

  return (
    <MapContainer
      center={SANTIAGO_CENTER}
      zoom={SANTIAGO_ZOOM}
      className="h-full w-full z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitHighlight places={filteredPlaces} highlightId={highlightId} draft={draft} />

      {draft ? (
        <Marker
          position={draft}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng()
              const next = new URLSearchParams(searchParams)
              next.set('draftLat', String(ll.lat))
              next.set('draftLng', String(ll.lng))
              setSearchParams(next)
            },
          }}
        >
          <Popup>
            <div className="min-w-[160px] text-sm">
              <strong className="font-semibold">Ubicación del lugar</strong>
              <div className="mt-1 text-xs text-muted-foreground">
                Arrastra el pin para ajustar.
              </div>
            </div>
          </Popup>
        </Marker>
      ) : null}

      {filteredPlaces.map((place) => (
        // Seleccionado = rojo (estilo Google)
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={L.divIcon({
            className: '',
            html: buildPinHtml({
              color: pinColor(place.band),
              glyph: categoryGlyph(place.category),
              selected: highlightId === place.id,
              size: highlightId === place.id ? 28 : 24,
            }),
            iconSize: [highlightId === place.id ? 28 : 24, (highlightId === place.id ? 28 : 24) + 12],
            iconAnchor: [
              Math.round((highlightId === place.id ? 28 : 24) / 2),
              Math.round((highlightId === place.id ? 28 : 24) + 6),
            ],
            popupAnchor: [0, -Math.round((highlightId === place.id ? 28 : 24) + 6)],
          })}
        >
          <Popup>
            <div className="min-w-[160px] text-sm">
              <strong className="font-semibold">{place.name}</strong>
              <div className="mt-1 text-xs text-muted-foreground">
                {getCategoryMeta(place.category).label} · ⭐ {place.avgRating.toFixed(1)} (
                {bandLabelEs(place.band)})
              </div>
              <div className="mt-2">
                <Button variant="default" size="sm" className="h-7 w-full" asChild>
                  <Link to={`/places/${place.id}`}>Ver detalle</Link>
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
