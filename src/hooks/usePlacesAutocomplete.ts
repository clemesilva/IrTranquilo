import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureGoogleMapsLoaded } from '../lib/googleMaps'

export interface PlaceSuggestion {
  placeId: string
  primaryText: string
  secondaryText: string
  description: string
}

export interface PlaceDetails {
  placeId: string
  name: string
  address: string
  latitude: number
  longitude: number
  openingHours: {
    weekdayText: string[]
    periods?: google.maps.places.PlaceOpeningHoursPeriod[]
    openNow?: boolean
  } | null
}

export function usePlacesAutocomplete() {
  const [ready, setReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])

  const acRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesRef = useRef<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureGoogleMapsLoaded()
        if (cancelled) return
        acRef.current = new google.maps.places.AutocompleteService()
        // PlacesService necesita un elemento DOM
        const el = document.createElement('div')
        placesRef.current = new google.maps.places.PlacesService(el)
        setReady(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar Google Maps.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const timerRef = useRef<number | null>(null)

  const fetchSuggestions = useCallback((input: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)

    const q = input.trim()
    if (!q) {
      setSuggestions([])
      return
    }

    timerRef.current = window.setTimeout(() => {
      const ac = acRef.current
      if (!ac) return
      setIsLoading(true)
      setError(null)
      ac.getPlacePredictions(
        {
          input: q,
          componentRestrictions: { country: 'cl' },
          types: ['establishment'],
        },
        (
          preds: google.maps.places.AutocompletePrediction[] | null,
          status: google.maps.places.PlacesServiceStatus,
        ) => {
          setIsLoading(false)
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([])
            return
          }
          if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
            setError(`Google Places: ${status}`)
            setSuggestions([])
            return
          }
          setSuggestions(
            preds.slice(0, 6).map((p) => ({
              placeId: p.place_id,
              description: p.description,
              primaryText: p.structured_formatting?.main_text ?? p.description,
              secondaryText: p.structured_formatting?.secondary_text ?? '',
            })),
          )
        },
      )
    }, 250)
  }, [])

  async function getDetails(placeId: string): Promise<PlaceDetails> {
    const svc = placesRef.current
    if (!svc) throw new Error('Google Places no está listo todavía.')
    setIsLoading(true)
    setError(null)

    return await new Promise<PlaceDetails>((resolve, reject) => {
      svc.getDetails(
        {
          placeId,
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'opening_hours'],
        },
        (
          place: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus,
        ) => {
          setIsLoading(false)
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
            reject(new Error(`Google Places: ${status}`))
            return
          }
          const loc = place.geometry?.location
          if (!loc) {
            reject(new Error('El lugar no trae coordenadas.'))
            return
          }
          resolve({
            placeId: place.place_id ?? placeId,
            name: place.name ?? '',
            address: place.formatted_address ?? '',
            latitude: loc.lat(),
            longitude: loc.lng(),
            openingHours: place.opening_hours
              ? {
                  weekdayText: place.opening_hours.weekday_text ?? [],
                  periods: place.opening_hours.periods,
                  openNow: place.opening_hours.open_now,
                }
              : null,
          })
        },
      )
    })
  }

  return {
    ready,
    isLoading,
    error,
    suggestions,
    setSuggestions,
    fetchSuggestions,
    getDetails,
  }
}

