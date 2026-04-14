import type { RatingBand } from '../types/place'

export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((acc, r) => acc + r, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

export function ratingBand(avg: number): RatingBand {
  if (avg >= 4.5) return 'recommended'
  if (avg >= 3.5) return 'acceptable'
  return 'not_recommended'
}

export function bandLabelEs(band: RatingBand): string {
  switch (band) {
    case 'recommended':
      return 'Recomendado'
    case 'acceptable':
      return 'Aceptable'
    case 'not_recommended':
      return 'No recomendado'
  }
}

/** Variante de `Badge` (shadcn) según banda de rating. */
export function bandBadgeVariant(
  band: RatingBand,
): 'default' | 'secondary' | 'destructive' {
  switch (band) {
    case 'recommended':
      return 'default'
    case 'acceptable':
      return 'secondary'
    case 'not_recommended':
      return 'destructive'
  }
}
