-- =============================================================================
-- IrTranquilo — Checklist de accesibilidad: de place_accessibility_reviews → reviews
-- =============================================================================
-- Ejecuta en Supabase → SQL Editor, EN ORDEN (de arriba a abajo).
-- Haz backup / proyecto pausado antes de DROP TABLE.
--
-- Mapeo columnas viejas → reviews:
--   parking_near_entrance → nearby_parking
--   wheelchair_table_access → lowered_counter
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Columnas nuevas en reviews
-- -----------------------------------------------------------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS parking_accessible boolean,
  ADD COLUMN IF NOT EXISTS nearby_parking boolean,
  ADD COLUMN IF NOT EXISTS signage_clear boolean,
  ADD COLUMN IF NOT EXISTS ramp_available boolean,
  ADD COLUMN IF NOT EXISTS mechanical_stairs boolean,
  ADD COLUMN IF NOT EXISTS elevator_available boolean,
  ADD COLUMN IF NOT EXISTS wide_entrance boolean,
  ADD COLUMN IF NOT EXISTS accessible_bathroom boolean,
  ADD COLUMN IF NOT EXISTS circulation_clear boolean,
  ADD COLUMN IF NOT EXISTS lowered_counter boolean,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS photo_urls text[],
  ADD COLUMN IF NOT EXISTS video_url text;

-- -----------------------------------------------------------------------------
-- 2) Copiar checklist desde place_accessibility_reviews (solo filas con review_id)
-- -----------------------------------------------------------------------------
UPDATE public.reviews r
SET
  parking_accessible = par.parking_accessible,
  nearby_parking = par.parking_near_entrance,
  signage_clear = par.signage_clear,
  ramp_available = par.ramp_available,
  mechanical_stairs = par.mechanical_stairs,
  elevator_available = par.elevator_available,
  wide_entrance = par.wide_entrance,
  accessible_bathroom = par.accessible_bathroom,
  circulation_clear = par.circulation_clear,
  lowered_counter = par.wheelchair_table_access,
  source = COALESCE(NULLIF(trim(par.source), ''), 'user')
FROM public.place_accessibility_reviews par
WHERE par.review_id = r.id;

-- Si falla: quita columnas que tu `par` no tenga y ajusta el SET a mano.

-- -----------------------------------------------------------------------------
-- 3) Rating nullable (fila source = 'google')
-- -----------------------------------------------------------------------------
ALTER TABLE public.reviews
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- -----------------------------------------------------------------------------
-- 4) Trigger: promedio solo con reseñas de usuario con rating
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_place_rating()
RETURNS trigger AS $$
DECLARE
  avg numeric(3, 1);
  cnt integer;
  band rating_band;
  pid bigint;
BEGIN
  pid := COALESCE(NEW.place_id, OLD.place_id);

  SELECT
    AVG(rating)::numeric(3, 1),
    COUNT(*)
  INTO avg, cnt
  FROM public.reviews
  WHERE place_id = pid
    AND rating IS NOT NULL
    AND COALESCE(source, 'user') IS DISTINCT FROM 'google';

  IF cnt = 0 THEN
    avg := 0;
    band := 'not_recommended'::rating_band;
  ELSE
    IF avg >= 4.5 THEN
      band := 'recommended'::rating_band;
    ELSIF avg >= 3.5 THEN
      band := 'acceptable'::rating_band;
    ELSE
      band := 'not_recommended'::rating_band;
    END IF;
  END IF;

  UPDATE public.places
  SET
    avg_rating = COALESCE(avg, 0),
    review_count = cnt,
    rating_band = band
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5) Quitar RLS y tabla vieja
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view place_accessibility_reviews" ON public.place_accessibility_reviews;
DROP POLICY IF EXISTS "Authors can insert accessibility for own review" ON public.place_accessibility_reviews;
DROP POLICY IF EXISTS "Authors can update own accessibility review" ON public.place_accessibility_reviews;
DROP POLICY IF EXISTS "Authors can delete own accessibility review" ON public.place_accessibility_reviews;

DROP TABLE IF EXISTS public.place_accessibility_reviews;

-- -----------------------------------------------------------------------------
-- 6) (Opcional) Disparar recálculo por cada lugar tocado
-- -----------------------------------------------------------------------------
-- UPDATE public.places p SET updated_at = now()
-- FROM public.reviews r WHERE r.place_id = p.id;
