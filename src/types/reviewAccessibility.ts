/** Campos de checklist en `place_accessibility_reviews` (tri-estado: null / true / false). */
export const ACCESSIBILITY_REVIEW_KEYS = [
  'parking_accessible',
  'signage_clear',
  'ramp_available',
  'mechanical_stairs',
  'elevator_available',
  'wide_entrance',
  'accessible_bathroom',
  'circulation_clear',
] as const;

export type AccessibilityReviewKey = (typeof ACCESSIBILITY_REVIEW_KEYS)[number];

export type AccessibilityReviewValues = Record<
  AccessibilityReviewKey,
  boolean | null
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
      { key: 'parking_accessible', label: 'Parking accesible ♿' },
      { key: 'signage_clear', label: 'Señalización clara' },
      { key: 'ramp_available', label: 'Rampa disponible' },
      { key: 'mechanical_stairs', label: 'Escalera mecánica' },
    ],
  },
  {
    title: 'ENTRADA',
    fields: [
      { key: 'elevator_available', label: 'Ascensor' },
      {
        key: 'wide_entrance',
        label: 'Entrada ancha para silla de ruedas',
      },
    ],
  },
  {
    title: 'INTERIOR',
    fields: [
      { key: 'accessible_bathroom', label: 'Baño accesible' },
      { key: 'circulation_clear', label: 'Circulación interior amplia' },
    ],
  },
];

export function createEmptyAccessibilityValues(): AccessibilityReviewValues {
  return Object.fromEntries(
    ACCESSIBILITY_REVIEW_KEYS.map((k) => [k, null]),
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
