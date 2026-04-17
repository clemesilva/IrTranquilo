/**
 * Convención de rutas en el bucket `review-media` (2 carpetas + archivos en consola):
 * `FotosyVideosReview/{slug-nombre-lugar}/{archivo}`
 *
 * Solo el nombre del lugar (slug), sin id numérico en la ruta. Si dos lugares
 * comparten el mismo nombre, convendría distinguirlos en el nombre en BD o
 * ampliar esta lógica.
 */
const ROOT_PREFIX = 'FotosyVideosReview';

/** Normaliza el nombre del lugar a un segmento de ruta seguro (sin slashes). */
export function slugifyPlaceFolderSegment(name: string): string {
  const stripped = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 56);
  return stripped.length > 0 ? stripped : 'lugar';
}

export function reviewMediaFolderForPlace(placeName: string): string {
  return slugifyPlaceFolderSegment(placeName);
}

/** Prefijo de carpeta para todas las fotos/videos de un lugar (sin barra final). */
export function reviewMediaBasePathForPlace(placeName: string): string {
  return `${ROOT_PREFIX}/${reviewMediaFolderForPlace(placeName)}`;
}
