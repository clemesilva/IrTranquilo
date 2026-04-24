const DETAIL_ZOOM = 15

export const MAP_UI_PADDING_LANDING = {
  top: 16,
  right: 368, // right sidebar ~22rem
  bottom: 88,
  left: 16,
}

export const MAP_UI_PADDING_EXPLORE = {
  top: 24,
  right: 368,
  bottom: 88,
  left: 400, // left list panel w-96
}

/**
 * Centra un punto en la zona "útil" del mapa con animación suave de zoom + pan.
 */
export function fitMapToPlaceWithUiPadding(
  map: google.maps.Map,
  lat: number,
  lng: number,
  padding: { top: number; right: number; bottom: number; left: number },
  options?: { maxZoom?: number; mobileBottomPx?: number },
): void {
  const isMobile = window.innerWidth < 640
  const targetZoom = options?.maxZoom ?? DETAIL_ZOOM
  const bottomPx = options?.mobileBottomPx ?? 160
  const rightPx = padding.right

  // Grados por pixel a zoom objetivo (Mercator)
  const lngDegPerPx = 360 / (256 * Math.pow(2, targetZoom))
  const latDegPerPx = lngDegPerPx * Math.cos(lat * (Math.PI / 180))

  const centerLat = isMobile ? lat - (bottomPx / 2) * latDegPerPx : lat
  const centerLng = isMobile ? lng : lng + (rightPx / 2) * lngDegPerPx
  const fromZoom = map.getZoom() ?? 12
  const fromCenter = map.getCenter()
  const fromLat = fromCenter?.lat() ?? lat
  const fromLng = fromCenter?.lng() ?? lng
  const duration = 420
  const start = performance.now()

  function easeOut(t: number) {
    return 1 - Math.pow(1 - t, 3)
  }

  // Anima centro + zoom juntos en cada frame para evitar conflictos
  function animateCamera(now: number) {
    const t = Math.min((now - start) / duration, 1)
    const e = easeOut(t)
    map.setCenter({
      lat: fromLat + (centerLat - fromLat) * e,
      lng: fromLng + (centerLng - fromLng) * e,
    })
    map.setZoom(fromZoom + (targetZoom - fromZoom) * e)
    if (t < 1) requestAnimationFrame(animateCamera)
  }
  requestAnimationFrame(animateCamera)
}
