import type { PlaceCategory } from '../types/place'
import { COLORS } from '../styles/colors'
import { categoryIconSvgString } from '../components/icons/appIcons'

export function categoryGlyph(category: PlaceCategory): string {
  return categoryIconSvgString(category, 13, 'white')
}

export function buildPinHtml(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
  hasAlert?: boolean
}): string {
  const { color, glyph, selected, size, hasAlert } = params

  const transition = 'transition:transform 0.2s ease,opacity 0.2s ease;'

  if (selected) {
    const pinW = size + 8
    const pinH = pinW * 1.4
    const r = pinW / 2
    return `
      <div style="position:relative;width:${pinW}px;height:${pinH}px;display:flex;flex-direction:column;align-items:center;${transition}">
        <div style="
          width:${pinW}px;height:${pinW}px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${COLORS.primary};
          box-shadow:0 3px 10px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="transform:rotate(45deg);width:${r}px;height:${r}px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;">
            ${glyph.replace(/stroke="white"/g, `stroke="${COLORS.primary}"`)}
          </div>
        </div>
        ${hasAlert ? `<span style="position:absolute;top:-4px;right:-4px;background:${COLORS.alertBg};color:${COLORS.text};border-radius:999px;font-size:10px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border:1px solid ${COLORS.alertBorder}">!</span>` : ''}
      </div>
    `.trim()
  }

  // Normal circular pin
  const cls = 'it-pin'
  return `
    <div class="${cls}" style="position:relative;background:${color};color:${color};width:${size}px;height:${size}px;${transition}">
      <span class="it-pin__glyph">${glyph}</span>
      ${hasAlert ? `<span class="it-pin__badge" style="position:absolute;top:-4px;right:-4px;background:${COLORS.alertBg};color:${COLORS.text};border-radius:999px;font-size:10px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border:1px solid ${COLORS.alertBorder}">!</span>` : ''}
    </div>
  `.trim()
}

/**
 * Extrae el contenido interno del SVG de un ícono Lucide y lo posiciona
 * dentro del SVG del pin usando <g transform> en lugar de SVG anidado.
 * Los íconos Lucide tienen viewBox="0 0 24 24", por eso scale = targetSize/24.
 */
function glyphAsGroup(
  glyph: string,
  targetSize: number,
  cx: number,
  cy: number,
  strokeColor: string,
): string {
  const inner = glyph.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')
  const scale = targetSize / 24
  const tx = cx - targetSize / 2
  const ty = cy - targetSize / 2
  return `<g transform="translate(${tx},${ty}) scale(${scale})" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
}

/**
 * Builds a pin as an SVG data URL for use with google.maps.Marker icon.
 */
export function buildPinSvgIcon(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
  hasAlert?: boolean
}): { url: string; anchor: google.maps.Point; scaledSize: google.maps.Size } {
  const { color, glyph, selected, size, hasAlert } = params

  if (selected) {
    // Classic teardrop pin: smooth bezier curves from circle to pointed tip
    const pinW = size + 10
    const pinH = Math.round(pinW * 1.45)
    const cx = pinW / 2
    const r = pinW / 2 - 1
    const tipY = pinH - 1
    // Bezier control points for smooth teardrop sides
    const path = [
      `M ${cx} ${tipY}`,
      `C ${cx - r * 0.35} ${tipY - pinH * 0.18}, ${cx - r} ${r * 1.5}, ${cx - r} ${r}`,
      `A ${r} ${r} 0 1 1 ${cx + r} ${r}`,
      `C ${cx + r} ${r * 1.5}, ${cx + r * 0.35} ${tipY - pinH * 0.18}, ${cx} ${tipY}`,
      `Z`,
    ].join(' ')

    const innerR = Math.round(r * 0.52)
    const glyphSize = Math.round(innerR * 1.5)

    const badge = hasAlert
      ? `<circle cx="${pinW - 4}" cy="4" r="5.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
         <text x="${pinW - 4}" y="7.5" text-anchor="middle" font-size="7" font-weight="bold" fill="white">!</text>`
      : ''

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pinW}" height="${pinH}">
      <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/></filter>
      <path d="${path}" fill="${COLORS.primary}" filter="url(#s)"/>
      <circle cx="${cx}" cy="${r}" r="${innerR}" fill="white"/>
      ${glyphAsGroup(glyph, glyphSize, cx, r, COLORS.primary)}
      ${badge}
    </svg>`

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      anchor: new google.maps.Point(cx, pinH),
      scaledSize: new google.maps.Size(pinW, pinH),
    }
  }

  const r = size / 2
  const glyphSize = Math.round(r * 0.85)

  const badge = hasAlert
    ? `<circle cx="${size - 3}" cy="3" r="4.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
       <text x="${size - 3}" y="6" text-anchor="middle" font-size="6" font-weight="bold" fill="white">!</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/></filter>
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${color}" stroke="white" stroke-width="2" filter="url(#s)"/>
    ${glyphAsGroup(glyph, glyphSize, r, r, 'white')}
    ${badge}
  </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: new google.maps.Point(r, r),
    scaledSize: new google.maps.Size(size, size),
  }
}

/**
 * Returns the raw SVG string for a pin (no data URL wrapper).
 * Can be used as innerHTML for AdvancedMarkerElement content.
 */
export function buildPinSvgString(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
  hasAlert?: boolean
}): string {
  const { color, glyph, selected, size, hasAlert } = params

  if (selected) {
    const pinW = size + 10
    const pinH = Math.round(pinW * 1.45)
    const cx = pinW / 2
    const r = pinW / 2 - 1
    const tipY = pinH - 1
    const path = [
      `M ${cx} ${tipY}`,
      `C ${cx - r * 0.35} ${tipY - pinH * 0.18}, ${cx - r} ${r * 1.5}, ${cx - r} ${r}`,
      `A ${r} ${r} 0 1 1 ${cx + r} ${r}`,
      `C ${cx + r} ${r * 1.5}, ${cx + r * 0.35} ${tipY - pinH * 0.18}, ${cx} ${tipY}`,
      `Z`,
    ].join(' ')
    const innerR = Math.round(r * 0.52)
    const glyphSize = Math.round(innerR * 1.5)
    const badge = hasAlert
      ? `<circle cx="${pinW - 4}" cy="4" r="5.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
         <text x="${pinW - 4}" y="7.5" text-anchor="middle" font-size="7" font-weight="bold" fill="white">!</text>`
      : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pinW}" height="${pinH}">
      <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.35"/></filter>
      <path d="${path}" fill="${COLORS.primary}" filter="url(#s)"/>
      <circle cx="${cx}" cy="${r}" r="${innerR}" fill="white"/>
      ${glyphAsGroup(glyph, glyphSize, cx, r, COLORS.primary)}
      ${badge}
    </svg>`
  }

  const r = size / 2
  const glyphSize = Math.round(r * 0.85)
  const badge = hasAlert
    ? `<circle cx="${size - 3}" cy="3" r="4.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
       <text x="${size - 3}" y="6" text-anchor="middle" font-size="6" font-weight="bold" fill="white">!</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/></filter>
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${color}" stroke="white" stroke-width="2" filter="url(#s)"/>
    ${glyphAsGroup(glyph, glyphSize, r, r, 'white')}
    ${badge}
  </svg>`
}

/**
 * Builds an HTMLDivElement containing the pin SVG.
 * Used as `content` for google.maps.marker.AdvancedMarkerElement.
 */
export function buildPinElement(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
  hasAlert?: boolean
}): HTMLDivElement {
  const el = document.createElement('div')
  el.className = params.selected ? 'map-pin map-pin--entering' : 'map-pin'
  el.innerHTML = buildPinSvgString(params)
  return el
}

/** Teardrop que se encoge hacia el tip — usado al deseleccionar antes de mostrar el círculo. */
export function buildPinSvgIconShrink(params: {
  color: string
  glyph: string
  size: number
  hasAlert?: boolean
}): { url: string; anchor: google.maps.Point; scaledSize: google.maps.Size } {
  const { color, glyph, size, hasAlert } = params
  const pinW = size + 10
  const pinH = Math.round(pinW * 1.45)
  const cx = pinW / 2
  const r = pinW / 2 - 1
  const tipY = pinH - 1
  const innerR = Math.round(r * 0.52)
  const glyphSize = Math.round(innerR * 1.5)

  const path = [
    `M ${cx} ${tipY}`,
    `C ${cx - r * 0.35} ${tipY - pinH * 0.18}, ${cx - r} ${r * 1.5}, ${cx - r} ${r}`,
    `A ${r} ${r} 0 1 1 ${cx + r} ${r}`,
    `C ${cx + r} ${r * 1.5}, ${cx + r * 0.35} ${tipY - pinH * 0.18}, ${cx} ${tipY}`,
    `Z`,
  ].join(' ')

  const badge = hasAlert
    ? `<circle cx="${pinW - 4}" cy="4" r="5.5" fill="#F59E0B" stroke="white" stroke-width="1.5"/>
       <text x="${pinW - 4}" y="7.5" text-anchor="middle" font-size="7" font-weight="bold" fill="white">!</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pinW}" height="${pinH}">
    <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.35"/></filter>
    <g transform="translate(${cx},${pinH})">
      <g>
        <animateTransform attributeName="transform" type="scale"
          values="1;0.05" keyTimes="0;1"
          dur="0.25s" calcMode="spline" keySplines="0.4 0 1 1"
          fill="freeze" additive="replace"/>
        <g transform="translate(${-cx},${-pinH})">
          <path d="${path}" fill="${color}" filter="url(#s)"/>
          <circle cx="${cx}" cy="${r}" r="${innerR}" fill="white"/>
          ${glyphAsGroup(glyph, glyphSize, cx, r, color)}
          ${badge}
        </g>
      </g>
    </g>
  </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: new google.maps.Point(cx, pinH),
    scaledSize: new google.maps.Size(pinW, pinH),
  }
}
