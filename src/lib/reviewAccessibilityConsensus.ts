import {
  ACCESSIBILITY_REVIEW_KEYS,
  createEmptyAccessibilityValues,
  type AccessibilityReviewKey,
  type AccessibilityReviewValues,
} from '@/types/reviewAccessibility'

export type ConsensusForField =
  | {
      source: 'user'
      yes: number
      no: number
      total: number
      ratio: number
      /** true si se considera accesible bajo regla estricta (≥ 60 %). */
      value: boolean
    }
  | {
      source: 'google'
      value: boolean
    }
  | null

/** Consenso “sí” estricto: al menos una respuesta y ≥ 60 % confirman true (misma regla que filtros y fichas). */
export function consensusFieldStrictYes(c: ConsensusForField | null | undefined): boolean {
  if (!c) return false
  if (c.source === 'google') return c.value === true
  return c.total > 0 && c.ratio >= 0.6
}

export type AccessibilityConsensusMap = Record<
  AccessibilityReviewKey,
  ConsensusForField
>

/** Fila tal como viene de Supabase (snake_case). */
export type PlaceAccessibilityReviewRow = Record<AccessibilityReviewKey, boolean | null> & {
  id?: number
  review_id?: number
  place_id?: number
  source?: string | null
}

export function rowToAccessibilityValues(
  row: Record<string, unknown> | null | undefined,
): AccessibilityReviewValues {
  const out = createEmptyAccessibilityValues()
  if (!row) return out
  for (const k of ACCESSIBILITY_REVIEW_KEYS) {
    const v = row[k]
    out[k] = v === true ? true : v === false ? false : null
  }
  return out
}

export function computeAccessibilityConsensus(
  rows: PlaceAccessibilityReviewRow[],
): AccessibilityConsensusMap {
  const initial = Object.fromEntries(
    ACCESSIBILITY_REVIEW_KEYS.map((k) => [k, null]),
  ) as AccessibilityConsensusMap

  if (rows.length === 0) {
    return initial
  }

  for (const key of ACCESSIBILITY_REVIEW_KEYS) {
    const userResponses = rows.filter((r) => {
      const src = (r.source ?? 'user').toLowerCase()
      if (src === 'google') return false
      return r[key] !== null && r[key] !== undefined
    })

    if (userResponses.length > 0) {
      const yes = userResponses.filter((r) => r[key] === true).length
      const total = userResponses.length
      const no = total - yes
      const ratio = total > 0 ? yes / total : 0
      initial[key] = {
        source: 'user',
        yes,
        no,
        total,
        ratio,
        value: ratio >= 0.6,
      }
      continue
    }

    const googleRow = rows.find(
      (r) => (r.source ?? '').toLowerCase() === 'google',
    )
    const googleVal = googleRow ? googleRow[key] : null
    if (typeof googleVal === 'boolean') {
      initial[key] = { source: 'google', value: googleVal }
      continue
    }
  }
  return initial
}
