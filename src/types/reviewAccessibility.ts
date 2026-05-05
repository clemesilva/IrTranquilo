/** Campos de checklist en `reviews` (tri-estado: null / true / false). Nombres = columnas SQL. */
export const ACCESSIBILITY_REVIEW_KEYS = [
  'parking_accessible',
  'nearby_parking',
  'service_dogs_allowed',
  'ramp_available',
  'non_slip_surface',
  'accessible_route',
  'elevator_available',
  'mechanical_stairs',
  'wide_entrance',
  'circulation_clear',
  'lowered_counter',
  'accessible_bathroom',
  'dining_table_accessible',
  'staff_kind',
  'staff_helpful',
  'staff_patient',
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
  /** Si el campo está respaldado por legislación chilena vigente. */
  isLaw: boolean;
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
        description:
          'Estacionamiento reservado para personas con discapacidad (Ley 19.900)',
        isLaw: true,
      },
      {
        key: 'nearby_parking',
        label: 'Parking cercano',
        description: 'Hay estacionamiento a menos de 50 m del local',
        isLaw: false,
      },
      {
        key: 'service_dogs_allowed',
        label: 'Perros de asistencia',
        description:
          'Se permite el ingreso de perros guía o de servicio (Ley 20.025)',
        isLaw: true,
      },
    ],
  },
  {
    title: 'ACCESO',
    fields: [
      {
        key: 'ramp_available',
        label: 'Rampa accesible',
        description: 'Rampa de acceso al local (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'non_slip_surface',
        label: 'Piso antideslizante',
        description:
          'Piso antideslizante en acceso y circulación (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'accessible_route',
        label: 'Ruta sin obstáculos',
        description:
          'Ruta despejada desde el acceso hasta el interior (OGUC Art. 4.1.7)',
        isLaw: true,
      },
    ],
  },
  {
    title: 'DESPLAZAMIENTO VERTICAL',
    fields: [
      {
        key: 'elevator_available',
        label: 'Ascensor',
        description:
          'Ascensor habilitado para personas con movilidad reducida (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'mechanical_stairs',
        label: 'Escalera mecánica',
        description: 'Alternativa de desplazamiento vertical',
        isLaw: false,
      },
    ],
  },
  {
    title: 'INTERIOR',
    fields: [
      {
        key: 'wide_entrance',
        label: 'Entrada ancha',
        description:
          'Puerta de al menos 90 cm para silla de ruedas (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'circulation_clear',
        label: 'Circulación amplia',
        description: 'Pasillos interiores sin obstáculos (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'lowered_counter',
        label: 'Mesón accesible',
        description:
          'Mesón de atención a altura de silla de ruedas (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'accessible_bathroom',
        label: 'Baño accesible',
        description:
          'Baño adaptado para personas con discapacidad (OGUC Art. 4.1.7)',
        isLaw: true,
      },
      {
        key: 'dining_table_accessible',
        label: 'Mesa accesible',
        description: 'Mesa con altura y espacio adecuado para silla de ruedas',
        isLaw: false,
      },
    ],
  },
  {
    title: 'PERSONAL',
    fields: [
      {
        key: 'staff_kind',
        label: 'Trato amable',
        description: 'El personal trata con respeto y sin impaciencia',
        isLaw: false,
      },
      {
        key: 'staff_helpful',
        label: 'Disposición a ayudar',
        description: 'Ofrecen asistencia sin que tengas que pedirla',
        isLaw: false,
      },
      {
        key: 'staff_patient',
        label: 'Tiempo atención adecuado',
        description: 'No te apuran ni te hacen sentir una carga',
        isLaw: false,
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
      return 'Inaccesible';
    case 2:
      return 'Poco accesible';
    case 3:
      return 'Parcialmente accesible';
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
