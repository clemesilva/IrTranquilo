-- =============================================================================
-- IrTranquilo — ejecutar MANUALMENTE en Supabase (SQL editor) si tu proyecto
-- aún NO tiene esta parte del esquema.
-- =============================================================================
-- Si ya aplicaste el `supabase.sql` completo del repo, la tabla
-- `place_accessibility_reviews`, triggers y RLS suelen estar creados: en ese
-- caso NO hace falta repetir todo; solo revisa que existan.
--
-- Nombres reales en este proyecto:
--   • Reseñas: `reviews` (place_id, author_id, rating, comment, …)
--   • Promedio en `places`: `avg_rating` y `review_count` (triggers / app)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Una sola reseña por usuario y lugar
-- -----------------------------------------------------------------------------
-- Antes de crear el índice, comprueba duplicados:
--   SELECT place_id, author_id, COUNT(*) FROM public.reviews GROUP BY 1,2 HAVING COUNT(*) > 1;
-- Si hay filas, elimina o fusiona duplicados antes de continuar.

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_place_author
  ON public.reviews (place_id, author_id);

-- -----------------------------------------------------------------------------
-- 1) Tabla checklist (NULL = no respondido; nunca false por defecto en la app)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_accessibility_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  place_id BIGINT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,

  parking_available BOOLEAN NOT NULL DEFAULT FALSE,
  parking_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  parking_near_entrance BOOLEAN NOT NULL DEFAULT FALSE,
  signage_clear BOOLEAN NOT NULL DEFAULT FALSE,

  step_free_access BOOLEAN NOT NULL DEFAULT FALSE,
  ramp_available BOOLEAN NOT NULL DEFAULT FALSE,
  elevator_available BOOLEAN NOT NULL DEFAULT FALSE,
  entrance_width_ok BOOLEAN NOT NULL DEFAULT FALSE,

  interior_spacious BOOLEAN NOT NULL DEFAULT FALSE,
  wheelchair_table_access BOOLEAN NOT NULL DEFAULT FALSE,
  accessible_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
  circulation_clear BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_accessibility_reviews_place_id
  ON public.place_accessibility_reviews(place_id);

-- Trigger updated_at (requiere función `update_updated_at_column` del proyecto)
DROP TRIGGER IF EXISTS trigger_place_accessibility_reviews_updated_at ON public.place_accessibility_reviews;
CREATE TRIGGER trigger_place_accessibility_reviews_updated_at
  BEFORE UPDATE ON public.place_accessibility_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2) RLS (mismos nombres que en supabase.sql del repo)
-- -----------------------------------------------------------------------------
ALTER TABLE public.place_accessibility_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view place_accessibility_reviews" ON public.place_accessibility_reviews;
CREATE POLICY "Anyone can view place_accessibility_reviews"
  ON public.place_accessibility_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors can insert accessibility for own review" ON public.place_accessibility_reviews;
CREATE POLICY "Authors can insert accessibility for own review"
  ON public.place_accessibility_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews pr
      WHERE pr.id = review_id AND pr.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can update own accessibility review" ON public.place_accessibility_reviews;
CREATE POLICY "Authors can update own accessibility review"
  ON public.place_accessibility_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews pr
      WHERE pr.id = review_id AND pr.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews pr
      WHERE pr.id = review_id AND pr.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can delete own accessibility review" ON public.place_accessibility_reviews;
CREATE POLICY "Authors can delete own accessibility review"
  ON public.place_accessibility_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews pr
      WHERE pr.id = review_id AND pr.author_id = auth.uid()
    )
  );
