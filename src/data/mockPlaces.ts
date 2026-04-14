import type { PlaceExtended, PlaceReview } from '../types/place'

export const MOCK_PLACES: PlaceExtended[] = [
  {
    id: 1,
    name: 'Café Plaza Italia',
    category: 'cafe',
    address: 'Av. Italia 1200, Providencia',
    latitude: -33.4378,
    longitude: -70.6215,
    features: {
      accessibleParking: true,
      accessibleEntrance: true,
      adaptedRestroom: true,
    },
    arrival: {
      accessibleParking: 'Dos cupos reservados junto a la entrada.',
      proximity: 'A 200 m de parada de metro accesible.',
      availability: 'Suele haber cupo en horario valle.',
    },
    entrance: {
      noSteps: true,
      ramp: true,
      accessNote: 'Rampa con pendiente suave y mano continua.',
    },
    interior: {
      space: 'Mesas con pasillo amplio entre filas.',
      restroom: 'Baño unisex adaptado verificado por usuarios.',
      elevator: 'No aplica (planta baja).',
    },
  },
  {
    id: 2,
    name: 'Restaurante El Roble',
    category: 'restaurant',
    address: 'Los Leones 3100, Ñuñoa',
    latitude: -33.4562,
    longitude: -70.6051,
    features: {
      accessibleParking: false,
      accessibleEntrance: true,
      adaptedRestroom: false,
    },
    arrival: {
      accessibleParking: 'Sin estacionamiento propio; calle con rampa verde cercana.',
      proximity: 'Entrada principal sobre vereda nivelada.',
      availability: 'Reservar mesa en planta baja recomendado.',
    },
    entrance: {
      noSteps: false,
      ramp: true,
      accessNote: 'Un escalón de 8 cm compensado con rampa portátil.',
    },
    interior: {
      space: 'Sector planta baja aceptable; salón superior solo por escaleras.',
      restroom: 'Baño pequeño, sin barras de apoyo reportadas.',
      elevator: 'No disponible.',
    },
  },
  {
    id: 3,
    name: 'Parque Bicentenario (acceso norte)',
    category: 'park',
    address: 'Bicentenario 3800, Vitacura',
    latitude: -33.3944,
    longitude: -70.5989,
    features: {
      accessibleParking: true,
      accessibleEntrance: true,
      adaptedRestroom: true,
    },
    arrival: {
      accessibleParking: 'Estacionamiento con cupos señalizados.',
      proximity: 'Sendero principal continuo desde el estacionamiento.',
      availability: 'Fin de semana puede llenarse temprano.',
    },
    entrance: {
      noSteps: true,
      ramp: false,
      accessNote: 'Acceso plano sin desniveles relevantes.',
    },
    interior: {
      space: 'Amplios caminos pavimentados; algunas zonas de césped blando.',
      restroom: 'Baños públicos adaptados en módulo central.',
      elevator: 'No aplica.',
    },
  },
  {
    id: 4,
    name: 'Clínica Andes',
    category: 'clinic',
    address: 'Apoquindo 4500, Las Condes',
    latitude: -33.415,
    longitude: -70.594,
    features: {
      accessibleParking: true,
      accessibleEntrance: true,
      adaptedRestroom: true,
    },
    arrival: {
      accessibleParking: 'Subterráneo con ascensor desde cupos señalizados.',
      proximity: 'Acceso directo desde estacionamiento a recepción.',
      availability: 'Cupos limitados en horario punta.',
    },
    entrance: {
      noSteps: true,
      ramp: true,
      accessNote: 'Puertas automáticas y contrapiso sin desnivel.',
    },
    interior: {
      space: 'Pasillos amplios; mostradores con altura mixta.',
      restroom: 'Baños adaptados en cada piso con ascensor.',
      elevator: 'Ascensores con ancho para silla y botonería baja.',
    },
  },
  {
    id: 5,
    name: 'Mall Urbano (entrada oriente)',
    category: 'mall',
    address: 'Vicuña Mackenna 6100, La Florida',
    latitude: -33.52,
    longitude: -70.598,
    features: {
      accessibleParking: true,
      accessibleEntrance: false,
      adaptedRestroom: true,
    },
    arrival: {
      accessibleParking: 'Cupos en varios niveles; ascensor de vehículo operativo.',
      proximity: 'Entrada oriente con vereda en reparación según reportes.',
      availability: 'Mejor acceso por entrada poniente.',
    },
    entrance: {
      noSteps: false,
      ramp: false,
      accessNote: 'Escalones fijos en acceso oriente; alternativa poniente con rampa.',
    },
    interior: {
      space: 'Pasillos estándar de mall.',
      restroom: 'Baños adaptados en food court.',
      elevator: 'Ascensores públicos en buen estado.',
    },
  },
]

export const MOCK_REVIEWS: PlaceReview[] = [
  { id: 1, placeId: 1, rating: 5, comment: 'Todo fluido con silla de ruedas.' },
  { id: 2, placeId: 1, rating: 5, comment: 'Baño impecable y amplio.' },
  { id: 3, placeId: 1, rating: 4, comment: 'Un poco ruidoso pero accesible.' },
  { id: 4, placeId: 2, rating: 4, comment: 'Rampa portátil ok, hay que avisar al llegar.' },
  { id: 5, placeId: 2, rating: 3, comment: 'Baño no adaptado, complicado.' },
  { id: 6, placeId: 3, rating: 5, comment: 'Parque muy accesible, lo recomiendo.' },
  { id: 7, placeId: 3, rating: 5, comment: 'Estacionamiento y baños bien señalizados.' },
  { id: 8, placeId: 4, rating: 5, comment: 'Edificio moderno, sin problemas.' },
  { id: 9, placeId: 4, rating: 4, comment: 'Ascensor a veces colapsado en punta.' },
  { id: 10, placeId: 5, rating: 3, comment: 'Entrada oriente es un problema.' },
  { id: 11, placeId: 5, rating: 3, comment: 'Usar otra entrada si van con silla.' },
]
