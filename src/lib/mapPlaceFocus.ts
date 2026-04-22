import L from 'leaflet'

const DETAIL_ZOOM = 14

/** Panel derecho (~22rem PlaceMapSidebar + borde) */
const RIGHT_PANEL_PX = 368

/** Layout landing: solo panel derecho sobre el mapa */
export const MAP_UI_PADDING_LANDING: Pick<
  L.FitBoundsOptions,
  'paddingTopLeft' | 'paddingBottomRight'
> = {
  paddingTopLeft: L.point(16, 16),
  paddingBottomRight: L.point(RIGHT_PANEL_PX, 88),
}

/** Explorar: lista izquierda fija (w-96) + panel derecho al seleccionar */
export const MAP_UI_PADDING_EXPLORE: Pick<
  L.FitBoundsOptions,
  'paddingTopLeft' | 'paddingBottomRight'
> = {
  paddingTopLeft: L.point(400, 24),
  paddingBottomRight: L.point(RIGHT_PANEL_PX, 88),
}

/**
 * Centra un punto en la zona “útil” del mapa, dejando hueco para UI (sidebars).
 * Equivalente práctico al centrado de Google Maps con panel lateral abierto.
 */
export function fitMapToPlaceWithUiPadding(
  map: L.Map,
  lat: number,
  lng: number,
  padding: Pick<
    L.FitBoundsOptions,
    'paddingTopLeft' | 'paddingBottomRight'
  >,
  options?: { maxZoom?: number; animate?: boolean },
): void {
  const delta = 0.00005
  const bounds = L.latLngBounds(
    [lat - delta, lng - delta],
    [lat + delta, lng + delta],
  )

  map.flyToBounds(bounds, {
    maxZoom: options?.maxZoom ?? DETAIL_ZOOM,
    duration: 0.8,
    easeLinearity: 0.25,
    paddingTopLeft: padding.paddingTopLeft,
    paddingBottomRight: padding.paddingBottomRight,
  })
}
