/** Campos de checklist en `place_accessibility_reviews` (solo true / false en app y DB). */
export const ACCESSIBILITY_REVIEW_KEYS = [
  'parking_available',
  'parking_accessible',
  'parking_near_entrance',
  'signage_clear',
  'step_free_access',
  'ramp_available',
  'elevator_available',
  'entrance_width_ok',
  'interior_spacious',
  'wheelchair_table_access',
  'accessible_bathroom',
  'circulation_clear',
] as const;

export type AccessibilityReviewKey = (typeof ACCESSIBILITY_REVIEW_KEYS)[number];

export type AccessibilityReviewValues = Record<
  AccessibilityReviewKey,
  boolean
>;

export type AccessibilityFieldDef = {
  key: AccessibilityReviewKey;
  label: string;
};

export type AccessibilityFieldGroup = {
  title: string;
  fields: AccessibilityFieldDef[];
};

export const ACCESSIBILITY_FIELD_GROUPS: AccessibilityFieldGroup[] = [
  {
    title: 'LLEGADA',
    fields: [
      { key: 'parking_available', label: 'Parking disponible' },
      { key: 'parking_accessible', label: 'Parking accesible' },
      { key: 'parking_near_entrance', label: 'Cerca de entrada' },
      { key: 'signage_clear', label: 'Señalización clara' },
    ],
  },
  {
    title: 'ENTRADA',
    fields: [
      { key: 'step_free_access', label: 'Sin escalones' },
      { key: 'ramp_available', label: 'Rampa disponible' },
      { key: 'elevator_available', label: 'Ascensor' },
      { key: 'entrance_width_ok', label: 'Ancho de entrada OK' },
    ],
  },
  {
    title: 'INTERIOR',
    fields: [
      { key: 'interior_spacious', label: 'Espacioso' },
      { key: 'wheelchair_table_access', label: 'Acceso a mesas' },
      { key: 'accessible_bathroom', label: 'Baño accesible' },
      { key: 'circulation_clear', label: 'Circulación clara' },
    ],
  },
];

export function createEmptyAccessibilityValues(): AccessibilityReviewValues {
  return Object.fromEntries(
    ACCESSIBILITY_REVIEW_KEYS.map((k) => [k, false]),
  ) as AccessibilityReviewValues;
}

export function ratingLabelEs(rating: number): string {
  switch (rating) {
    case 1:
      return 'Muy inaccesible';
    case 2:
      return 'Inaccesible';
    case 3:
      return 'Regular';
    case 4:
      return 'Accesible';
    case 5:
      return 'Muy accesible';
    default:
      return 'Elige una calificación';
  }
}

/** Reseña del usuario actual + checklist (para editar). */
export type MyReviewWithAccessibility = {
  id: number;
  rating: number;
  comment: string | null;
  accessibility: AccessibilityReviewValues;
};
