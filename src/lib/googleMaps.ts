import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let loaderPromise: Promise<void> | null = null;

export async function ensureGoogleMapsLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (loaderPromise) return loaderPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) throw new Error('Falta VITE_GOOGLE_MAPS_API_KEY en .env.local');

  setOptions({ key: apiKey, v: 'weekly', language: 'es', region: 'CL' });

  loaderPromise = Promise.all([
    importLibrary('core'),
    importLibrary('places'),
    importLibrary('maps'),
    importLibrary('marker'),
  ]).then(() => undefined);

  return loaderPromise;
}
