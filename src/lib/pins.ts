import type { PlaceCategory } from '../types/place'
import { CATEGORY_ICON } from '../types/place'

export function categoryGlyph(category: PlaceCategory): string {
  return CATEGORY_ICON[category] ?? '📍'
}

export function buildPinHtml(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
  hasAlert?: boolean
}): string {
  const { color, glyph, selected, size, hasAlert } = params
  const cls = selected ? 'it-pin it-pin--selected' : 'it-pin'
  return `
    <div class="${cls}" style="position:relative;background:${color};color:${color};width:${size}px;height:${size}px">
      <span class="it-pin__glyph">${glyph}</span>
      ${
        hasAlert
          ? '<span class="it-pin__badge" style="position:absolute;top:-4px;right:-4px;background:#facc15;color:#78350f;border-radius:999px;font-size:10px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,0.25)">⚠️</span>'
          : ''
      }
    </div>
  `.trim()
}
