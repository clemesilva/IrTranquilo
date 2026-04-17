# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (HMR).
- `npm run build` — type-check (`tsc -b`) then build for production. Use this as the "does it compile" check; there is no separate typecheck script.
- `npm run lint` — ESLint over the whole repo (flat config, TS + react-hooks + react-refresh).
- `npm run preview` — serve the production build locally.

No test runner is configured.

## Environment

Vite expects a `.env.local` (see `.env.example`). Required:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — `src/services/supabase.ts` throws at import time if missing.
- `VITE_GOOGLE_MAPS_API_KEY` — `src/lib/googleMaps.ts` throws when the Places autocomplete is first used (Add Place flow).

Path alias `@/*` → `src/*` is configured in `tsconfig.app.json`, `vite.config.ts`, and `components.json`. Both `@/…` and relative imports appear in the codebase; either is fine.

## High-level architecture

IrTranquilo is a Spanish-language, single-page React app that maps accessibility information for places in Santiago, Chile. Stack: React 19 + Vite + TypeScript, Tailwind v4 (via `@tailwindcss/vite`) + shadcn/radix-nova style, React Router v7, Leaflet (OpenStreetMap tiles) for rendering, Google Places for autocomplete when adding places, Supabase (Postgres + Auth) as the backend.

### Providers and routing

`src/App.tsx` wraps the app in `<AuthProvider>` + `<BrowserRouter>` + a Sonner `<Toaster>`. Every authenticated route is individually wrapped in `<PlacesProvider>`; `/login` is not. Unauthenticated users are redirected to `/login` from the route element (no shared guard component). Routes: `/` (LandingPage), `/explore`, `/places/new`, `/lugares/:id`.

`src/layouts/MainLayout.tsx` is a sidebar + right-hand `<PlacesMap>` layout via `<Outlet />` — but the current routes do NOT mount `MainLayout` (each page renders its own full layout). Treat `MainLayout` as dormant unless you explicitly reintroduce it.

### Data layer: PlacesProvider

`src/context/PlacesProvider.tsx` is the single source of truth for place/review data. On mount it runs `refreshPlaces()`, which in parallel:

1. Fetches `places` joined with an active-report count (`place_reports` rows whose `expires_at` is in the future — used to render a ⚠️ badge on pins).
2. Fetches all `place_accessibility_reviews` and builds a per-place `AccessibilityConsensusMap`.

Rows are mapped from snake_case DB columns to camelCase TS types via `mapPlaceFromDB` / `mapPlaceWithStats`. The provider also exposes: `filteredPlaces` (search + category + filters + consensus), `submitPlaceReview` (upserts `reviews` + `place_accessibility_reviews` for the current user, then calls `syncPlaceReviewStats` and `refreshPlaces`), `myReviewWithAccessibility`, `reviewsForPlace`, and `accessibilityConsensusForPlace`.

Context value and types live in `src/context/placesContext.ts`; the hook lives in `src/context/usePlaces.ts` (split so Fast Refresh treats the provider file as components-only). Same split pattern for auth: `AuthProvider.tsx` / `authContext.ts` / `useAuth.ts`.

### Rating + accessibility consensus rules (duplicated on purpose — keep in sync)

- **Rating bands** are computed client-side in `src/lib/rating.ts` (`ratingBand`: `>=4.5 recommended`, `>=3.5 acceptable`, else `not_recommended`) AND server-side by the Postgres trigger `recalculate_place_rating()` in `supabase.sql`. `src/lib/syncPlaceReviewStats.ts` also writes `avg_rating`, `review_count`, and `rating_band` from the client after a review upsert. If you change the thresholds, update all three.
- **Accessibility consensus** in `src/lib/reviewAccessibilityConsensus.ts`: user rows take precedence over Google rows; a field is "strict yes" when there is ≥1 user response and yes-ratio ≥ 0.6. The same 0.6 threshold is applied in `PlacesProvider` to accessibility filters (`consensusFieldStrictYes`). Update both together.

### Places schema: app vs DB

`supabase.sql` is stale — trust the schema below (confirmed live) and `sql/*.sql` migrations over it.

## Base de datos — Supabase Schema (estado actual)

### `users`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| email | varchar | NO | null |
| display_name | varchar | YES | null |
| avatar_url | text | YES | null |
| bio | text | YES | null |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| last_login_at | timestamptz | YES | null |

### `places`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| name | varchar | NO | null |
| category | text | NO | null |
| address | text | NO | null |
| latitude | numeric | NO | null |
| longitude | numeric | NO | null |
| created_by | uuid | NO | null |
| photo_url | text | YES | null |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| avg_rating | numeric | YES | 0 |
| review_count | integer | YES | 0 |
| rating_band | rating_band | YES | not_recommended |
| opening_hours | text[] | YES | null |
| phone | text | YES | null |
| website | text | YES | null |
| google_rating | numeric | YES | null |
| google_ratings_total | integer | YES | null |
| google_photo_url | text | YES | null |
| wheelchair_accessible | boolean | YES | null |
| price_level | integer | YES | null |

### `reviews`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| place_id | bigint | NO | null |
| author_id | uuid | NO | null |
| rating | smallint | NO | null |
| comment | text | YES | null |
| helpful_count | integer | YES | 0 |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### `place_accessibility_reviews`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| review_id | bigint | YES | null |
| place_id | bigint | YES | null |
| source | text | YES | 'user' |
| parking_accessible | boolean | YES | null |
| signage_clear | boolean | YES | null |
| ramp_available | boolean | YES | null |
| mechanical_stairs | boolean | YES | null |
| elevator_available | boolean | YES | null |
| wide_entrance | boolean | YES | null |
| accessible_bathroom | boolean | YES | null |
| circulation_clear | boolean | YES | null |
| created_at | timestamptz | YES | now() |

### `place_reports`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| place_id | bigint | YES | null |
| user_id | uuid | YES | null |
| type | text | NO | null |
| description | text | YES | null |
| expires_at | timestamptz | NO | null |
| created_at | timestamptz | YES | now() |

### `favorites`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| user_id | uuid | NO | null |
| place_id | bigint | NO | null |
| created_at | timestamptz | YES | now() |

### `helpful_votes`
| columna | tipo | nullable | default |
|---|---|---|---|
| id | bigint | NO | autoincrement |
| review_id | bigint | NO | null |
| user_id | uuid | NO | null |
| created_at | timestamptz | YES | now() |

### Reglas de negocio — Rating band
- `avg_rating >= 4.5` → `recommended` (verde)
- `avg_rating 3.5–4.4` → `acceptable` (amarillo)
- `avg_rating < 3.5` → `not_recommended` (rojo)
- Calculado client-side en `src/lib/rating.ts`, server-side por trigger Postgres, y en `src/lib/syncPlaceReviewStats.ts`. Cambiar los tres si se modifican los umbrales.

### Reglas de negocio — Consenso de accesibilidad
- `NULL` = no respondido, no cuenta en el cálculo
- `TRUE` = confirmado, `FALSE` = no existe
- Fórmula: `count(TRUE) / count(NOT NULL)` — umbral `>= 0.6` → accesible
- Sin respuestas → no mostrar
- Source `'google'` → dato automático al crear el lugar (`review_id` es NULL); source `'user'` → reseña real (tiene `review_id`)
- Datos de usuario reemplazan a Google en el consenso
- Implementado en `src/lib/reviewAccessibilityConsensus.ts` y en `PlacesProvider` (`consensusFieldStrictYes`). Cambiar ambos juntos.

### Reglas de negocio — place_reports expiración
- `elevator` → 7 días, `ramp` → 3 días, `construction` → 30 días, `other` → 24 horas
- Solo mostrar donde `expires_at > now()`

### Categorías válidas (`places.category`)
`alimentacion`, `comercio`, `salud`, `educacion`, `instituciones`, `servicios`, `espacios_publicos`, `cultura`, `deporte`, `alojamiento`, `inclusion`, `otro`

### Maps and pins

`LandingPage` and `ExplorePage` each instantiate their own Leaflet map directly (no `react-leaflet`) against `'landing-map'` / `'explore-map'` div IDs, iterate `filteredPlaces`, and render `buildPinHtml` (`src/lib/pins.ts`) as `L.divIcon`. Pin color comes from `getPinColor(avgRating)` in `src/styles/colors.ts` (traffic-light: green ≥4.5, yellow ≥3.5, red otherwise). `MainLayout` still uses `react-leaflet` — one of the two patterns may eventually go away. Defaults (`SANTIAGO_CENTER`, `SANTIAGO_ZOOM`) and a shared `fitMapToPlaceWithUiPadding` live in `src/lib/mapDefaults.ts` + `src/lib/mapPlaceFocus.ts`.

### Adding a place

`src/components/places/AddPlacePanel.tsx` + `src/hooks/usePlacesAutocomplete.ts` drive the Add Place flow. The hook lazy-loads Google Maps via `ensureGoogleMapsLoaded` (singleton `loaderPromise` in `src/lib/googleMaps.ts`) and exposes `AutocompleteService` + `PlacesService`. Google `types[]` is mapped to the app's Spanish categories with `mapGoogleTypeToCategory` (`src/lib/googleCategory.ts`) — unknowns fall back to `'otro'`.

### Auth specifics

`AuthProvider` mirrors the Supabase auth user into a row in `public.users` via `upsert({ id, email, display_name, updated_at })` on every session event. Email-signup is intentionally routed through confirm-then-sign-in: after `signUp`, if Supabase returns a session it is immediately signed out so the user must confirm email and sign in explicitly. Google OAuth redirects to `window.location.origin`.

### UI conventions

- shadcn components under `src/components/ui` (radix-nova style, neutral base) — ESLint disables `react-refresh/only-export-components` just for this folder.
- Colors come from `src/styles/colors.ts` (`COLORS`) and are applied as inline styles in many pages; Tailwind classes handle layout. If you need new semantic colors, add them there rather than hardcoding hex values in pages.
- Spanish UI copy throughout — keep new strings in Spanish unless the user asks otherwise.
