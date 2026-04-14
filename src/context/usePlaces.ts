import { useContext } from 'react'
import { PlacesContext, type PlacesContextValue } from './placesContext'

export function usePlaces(): PlacesContextValue {
  const ctx = useContext(PlacesContext)
  if (!ctx) throw new Error('usePlaces debe usarse dentro de PlacesProvider')
  return ctx
}
