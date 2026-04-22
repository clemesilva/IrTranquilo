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
  rawTypes: string[]
  openingHours: {
    weekdayText: string[]
    periods?: google.maps.places.PlaceOpeningHoursPeriod[]
    openNow?: boolean
  } | null
  phone: string | null
  website: string | null
  googleRating: number | null
  googleRatingsTotal: number | null
  googlePhotoUrl: string | null
  wheelchairAccessible: boolean | null
  priceLevel: number | null
}

type PlacesExtraFields = {
  wheelchair_accessible_entrance?: boolean
  user_ratings_total?: number
  price_level?: number
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
        // @ts-expect-error google maps types mismatch
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
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'types',
            'opening_hours',
            'photos',
            'wheelchair_accessible_entrance',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'price_level',
          ],
        },
        // @ts-expect-error google maps callback types mismatch
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
          const extra = place as google.maps.places.PlaceResult & PlacesExtraFields
          const wheelchair = extra.wheelchair_accessible_entrance
          const firstPhoto = place.photos?.[0]
          resolve({
            placeId: place.place_id ?? placeId,
            name: place.name ?? '',
            address: place.formatted_address ?? '',
            latitude: loc.lat(),
            longitude: loc.lng(),
            rawTypes: place.types ?? [],
            openingHours: place.opening_hours
              ? {
                  weekdayText: place.opening_hours.weekday_text ?? [],
                  periods: place.opening_hours.periods,
                  openNow: place.opening_hours.open_now,
                }
              : null,
            phone: place.formatted_phone_number ?? null,
            website: place.website ?? null,
            googleRating:
              typeof place.rating === 'number' ? place.rating : null,
            googleRatingsTotal:
              typeof extra.user_ratings_total === 'number'
                ? extra.user_ratings_total
                : null,
            googlePhotoUrl: firstPhoto
              ? firstPhoto.getUrl({ maxWidth: 800 })
              : null,
            wheelchairAccessible:
              typeof wheelchair === 'boolean' ? wheelchair : null,
            priceLevel:
              typeof extra.price_level === 'number' ? extra.price_level : null,
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

