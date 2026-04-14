import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import type { PlaceWithStats } from '../../context/placesContext'
import { usePlaces } from '../../context/usePlaces'
import { fixLeafletDefaultIcons } from '../../lib/leafletIcon'
import { bandLabelEs } from '../../lib/rating'
import { SANTIAGO_CENTER, SANTIAGO_ZOOM } from '../../lib/mapDefaults'

fixLeafletDefaultIcons()

function FitHighlight({
  places,
  highlightId,
}: {
  places: PlaceWithStats[]
  highlightId?: number
}) {
  const map = useMap()

  useEffect(() => {
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
  }, [map, places, highlightId])

  return null
}

export function PlacesMap({ highlightId }: { highlightId?: number }) {
  const { filteredPlaces } = usePlaces()

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
      <FitHighlight places={filteredPlaces} highlightId={highlightId} />
      {filteredPlaces.map((place) => (
        <Marker key={place.id} position={[place.latitude, place.longitude]}>
          <Popup>
            <div className="min-w-[160px] text-sm">
              <strong className="font-semibold">{place.name}</strong>
              <div className="mt-1 text-xs text-muted-foreground">
                {place.category} · ⭐ {place.avgRating.toFixed(1)} (
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
