import type { PlaceCategory } from '../types/place'

const CATEGORY_GLYPH: Record<PlaceCategory, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  gastronomy: '🍴',
  ice_cream: '🍨',
  winery: '🍷',
  mall: '🛍️',
  store: '🏬',
  apparel: '👔',
  home_goods: '🛋️',
  bookstore: '📚',
  pharmacy: '💊',
  park: '🌳',
  stadium: '🏟️',
  museum: '🏛️',
  convention_center: '🏢',
  clinic: '🏥',
  health_services: '⚕️',
  medical_office: '🩺',
  day_center: '☀️',
  therapeutic_school: '📖',
  integration_center: '🤝',
  job_training: '🎓',
  education: '🏫',
  foundation: '❤️',
  bank: '🏦',
  airline: '✈️',
  hotel: '🏨',
  travel_agency: '🧳',
  energy: '⚡',
  automotive: '🚗',
  billing: '🧾',
  other: '📍',
}

export function categoryGlyph(category: PlaceCategory): string {
  return CATEGORY_GLYPH[category] ?? '📍'
}

export function buildPinHtml(params: {
  color: string
  glyph: string
  selected: boolean
  size: number
}): string {
  const { color, glyph, selected, size } = params
  const cls = selected ? 'it-pin it-pin--selected' : 'it-pin'
  return `
    <div class="${cls}" style="background:${color};color:${color};width:${size}px;height:${size}px">
      <span class="it-pin__glyph">${glyph}</span>
    </div>
  `.trim()
}
