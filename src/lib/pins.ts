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
