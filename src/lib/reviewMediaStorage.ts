/** Ruta del objeto dentro del bucket `review-media` a partir de su URL pública de Supabase. */
export function storageObjectPathFromReviewMediaPublicUrl(
  url: string,
): string | null {
  try {
    const u = new URL(url);
    const marker = '/object/public/review-media/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + marker.length);
    const decoded = decodeURIComponent(raw.replace(/\/+$/, ''));
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
