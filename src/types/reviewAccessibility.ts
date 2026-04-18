/** Campos de checklist en `reviews` (tri-estado: null / true / false). Nombres = columnas SQL. */
export const ACCESSIBILITY_REVIEW_KEYS = [
  'parking_accessible',
  'nearby_parking',
  'signage_clear',
  'ramp_available',
  'mechanical_stairs',
  'elevator_available',
  'wide_entrance',
  'accessible_bathroom',
  'circulation_clear',
  'lowered_counter',
] as const;

export type AccessibilityReviewKey = (typeof ACCESSIBILITY_REVIEW_KEYS)[number];

export type AccessibilityReviewValues = Record<
  AccessibilityReviewKey,
  boolean | null
>;

export type AccessibilityFieldDef = {
  key: AccessibilityReviewKey;
  /** Texto corto en el chip (sin la explicación larga). */
  label: string;
  /** Detalle largo: mostrar solo en tooltip (title) al pasar el mouse. */
  description: string;
};

export type AccessibilityFieldGroup = {
  title: string;
  fields: AccessibilityFieldDef[];
};

export const ACCESSIBILITY_FIELD_GROUPS: AccessibilityFieldGroup[] = [
  {
    title: 'LLEGADA',
    fields: [
      {
        key: 'parking_accessible',
        label: 'Parking preferencial',
        description: 'Estacionamiento reservado para PcD',
      },
      {
        key: 'nearby_parking',
        label: 'Parking cercano',
        description: 'Hay estacionamiento a menos de 50 m del local',
      },
      {
        key: 'signage_clear',
        label: 'Señalización clara',
        description: 'Señalética visible desde la calle',
      },
      {
        key: 'ramp_available',
        label: 'Rampa disponible',
        description: 'Rampa de acceso al local',
      },
      {
        key: 'mechanical_stairs',
        label: 'Escalera mecánica',
        description: 'Alternativa para personas mayores',
      },
    ],
  },
  {
    title: 'ENTRADA',
    fields: [
      {
        key: 'elevator_available',
        label: 'Ascensor',
        description: 'Para locales en altura',
      },
      {
        key: 'wide_entrance',
        label: 'Entrada ancha',
        description: 'Puerta de al menos 90 cm para silla de ruedas',
      },
    ],
  },
  {
    title: 'INTERIOR',
    fields: [
      {
        key: 'accessible_bathroom',
        label: 'Baño accesible',
        description: 'Baño adaptado para PcD',
      },
      {
        key: 'circulation_clear',
        label: 'Circulación amplia',
        description: 'Pasillos sin obstáculos',
      },
      {
        key: 'lowered_counter',
        label: 'Mesón rebajado',
        description: 'Atención a altura de silla de ruedas',
      },
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
  /** null si la fila es solo metadatos Google (aún sin calificación). */
  rating: number | null;
  comment: string | null;
  accessibility: AccessibilityReviewValues;
  photoUrls: string[] | null;
  videoUrl: string | null;
  source?: string | null;
};

/** Media al publicar o actualizar una reseña (nuevos archivos + URLs que se conservan). */
export type PlaceReviewMediaInput = {
  newPhotos: File[];
  newVideo: File | null;
  retainPhotoUrls: string[];
  retainVideoUrl: string | null;
};
