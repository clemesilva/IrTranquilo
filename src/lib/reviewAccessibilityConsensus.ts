import {
  ACCESSIBILITY_REVIEW_KEYS,
  createEmptyAccessibilityValues,
  type AccessibilityReviewKey,
  type AccessibilityReviewValues,
} from '@/types/reviewAccessibility'

export type ConsensusForField =
  | {
      yes: number
      no: number
      total: number
      ratio: number
    }
  | null

/** Consenso “sí” estricto: al menos una respuesta y ≥ 60 % confirman true (misma regla que filtros y fichas). */
export function consensusFieldStrictYes(c: ConsensusForField | null | undefined): boolean {
  return c != null && c.ratio >= 0.6
}

export type AccessibilityConsensusMap = Record<
  AccessibilityReviewKey,
  ConsensusForField
>

/** Fila tal como viene de Supabase (snake_case). */
export type PlaceAccessibilityReviewRow = AccessibilityReviewValues & {
  id?: number
  review_id?: number
  place_id?: number
}

export function rowToAccessibilityValues(
  row: Record<string, unknown> | null | undefined,
): AccessibilityReviewValues {
  const out = createEmptyAccessibilityValues()
  if (!row) return out
  for (const k of ACCESSIBILITY_REVIEW_KEYS) {
    const v = row[k]
    out[k] = v === true
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
    const total = rows.length
    const yes = rows.filter((r) => r[key] === true).length
    const no = total - yes
    initial[key] = {
      yes,
      no,
      total,
      ratio: yes / total,
    }
  }
  return initial
}
