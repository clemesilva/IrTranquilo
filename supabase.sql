-- ============================================================================
-- IrTranquilo - Supabase SQL Schema
-- ============================================================================
-- Este script crea toda la estructura de BD para IrTranquilo
-- Cópialo y pégalo en Supabase > SQL Editor > "New Query"
-- ============================================================================

-- ============================================================================
-- 1. CREAR TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE place_category AS ENUM (
  'restaurant',
  'cafe',
  'gastronomy',
  'ice_cream',
  'winery',
  'mall',
  'store',
  'apparel',
  'home_goods',
  'bookstore',
  'pharmacy',
  'park',
  'stadium',
  'museum',
  'convention_center',
  'clinic',
  'health_services',
  'medical_office',
  'day_center',
  'therapeutic_school',
  'integration_center',
  'job_training',
  'education',
  'foundation',
  'bank',
  'airline',
  'hotel',
  'travel_agency',
  'energy',
  'automotive',
  'billing',
  'other'
);

CREATE TYPE rating_band AS ENUM (
  'recommended',    -- >= 4.5
  'acceptable',     -- >= 3.5 y < 4.5
  'not_recommended' -- < 3.5
);

-- ============================================================================
-- 2. TABLA: users (Usuarios)
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Auditoría
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 3. TABLA: places (Lugares)
-- ============================================================================

CREATE TABLE places (
  id BIGSERIAL PRIMARY KEY,

  -- Información básica
  name VARCHAR(200) NOT NULL,
  category place_category NOT NULL,
  address TEXT NOT NULL,

  -- Ubicación (Lat/Long)
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,

  -- Horario (Google Places)
  opening_hours TEXT[],

  -- Creador del lugar
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  photo_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Desnormalizado desde reviews (triggers + app)
  avg_rating DECIMAL(3, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  rating_band rating_band DEFAULT 'not_recommended'
);

-- Índices para búsqueda y filtrado
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_created_by ON places(created_by);
CREATE INDEX idx_places_created_at ON places(created_at DESC);
CREATE INDEX idx_places_avg_rating ON places(avg_rating DESC);

-- Búsqueda por nombre y dirección (Full-text search)
CREATE INDEX idx_places_name_search ON places USING GIN(
  to_tsvector('spanish', name || ' ' || COALESCE(address, ''))
);

-- ============================================================================
-- 4. TABLA: reviews (Reseñas)
-- ============================================================================

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,

  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Flags útiles
  helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_place_id ON reviews(place_id);
CREATE INDEX idx_reviews_author_id ON reviews(author_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Una reseña por usuario y lugar
CREATE UNIQUE INDEX uq_reviews_place_author ON reviews (place_id, author_id);

-- ============================================================================
-- 4b. TABLA: place_accessibility_reviews (checklist por reseña)
-- ============================================================================

CREATE TABLE place_accessibility_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,

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

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_place_accessibility_reviews_place_id
  ON place_accessibility_reviews(place_id);

-- ============================================================================
-- 5. TABLA: helpful_votes (Votos de "útil" en reseñas)
-- ============================================================================

CREATE TABLE helpful_votes (
  id BIGSERIAL PRIMARY KEY,

  review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Una persona puede votarle "útil" solo 1 vez a cada review
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_helpful_votes_review_id ON helpful_votes(review_id);
CREATE INDEX idx_helpful_votes_user_id ON helpful_votes(user_id);

-- ============================================================================
-- 6. TABLA: favorites (Lugares guardados por usuarios)
-- ============================================================================

CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un usuario puede favoritar un lugar solo 1 vez
  UNIQUE(user_id, place_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_place_id ON favorites(place_id);

-- ============================================================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Función para actualizar el timestamp "updated_at"
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para "updated_at"
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCIÓN: Recalcular rating de un lugar cuando se agrega/modifica/elimina
-- una reseña
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_place_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg DECIMAL(3, 1);
  cnt INTEGER;
  band rating_band;
BEGIN
  -- Calcular promedio y contar
  SELECT AVG(rating)::DECIMAL(3, 1), COUNT(*)
  INTO avg, cnt
  FROM reviews
  WHERE place_id = COALESCE(NEW.place_id, OLD.place_id);

  -- Si no hay reseñas, values por defecto
  IF cnt = 0 THEN
    avg := 0;
    band := 'not_recommended';
  ELSE
    -- Calcular banda
    IF avg >= 4.5 THEN
      band := 'recommended';
    ELSIF avg >= 3.5 THEN
      band := 'acceptable';
    ELSE
      band := 'not_recommended';
    END IF;
  END IF;

  -- Actualizar el lugar
  UPDATE places
  SET
    avg_rating = COALESCE(avg, 0),
    review_count = cnt,
    rating_band = band
  WHERE id = COALESCE(NEW.place_id, OLD.place_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener el rating sincronizado
CREATE TRIGGER trigger_reviews_rating_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_place_rating();

CREATE TRIGGER trigger_reviews_rating_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_place_rating();

CREATE TRIGGER trigger_reviews_rating_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_place_rating();

-- ============================================================================
-- FUNCIÓN: Recalcular contador de votos útiles en reseña
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reviews
  SET helpful_count = (
    SELECT COUNT(*) FROM helpful_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_helpful_votes_count_insert
  AFTER INSERT ON helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_helpful_count();

CREATE TRIGGER trigger_helpful_votes_count_delete
  AFTER DELETE ON helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_helpful_count();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) - Control de acceso
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_accessibility_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- POLICIES para 'users'
-- Todos pueden ver perfiles públicos
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT USING (true);

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- POLICIES para 'places'
-- Todos pueden ver todos los lugares
CREATE POLICY "Anyone can view places"
  ON places FOR SELECT USING (true);

-- Usuarios autenticados pueden agregar lugares
CREATE POLICY "Authenticated users can create places"
  ON places FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Creador puede actualizar su lugar
CREATE POLICY "Users can update own places"
  ON places FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Creador puede eliminar su lugar
CREATE POLICY "Users can delete own places"
  ON places FOR DELETE
  USING (auth.uid() = created_by);

-- POLICIES para 'reviews'
-- Todos pueden ver reseñas
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT USING (true);

-- Usuarios autenticados pueden agregar reseñas
CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Autor puede actualizar su reseña
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Autor puede eliminar su reseña
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = author_id);

-- POLICIES para 'place_accessibility_reviews'
CREATE POLICY "Anyone can view place_accessibility_reviews"
  ON place_accessibility_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authors can insert accessibility for own review"
  ON place_accessibility_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.author_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own accessibility review"
  ON place_accessibility_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.author_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete own accessibility review"
  ON place_accessibility_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.author_id = auth.uid()
    )
  );

-- POLICIES para 'helpful_votes'
-- Usuarios autenticados pueden votar
CREATE POLICY "Authenticated users can vote"
  ON helpful_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Pueden ver votos
CREATE POLICY "Anyone can view votes"
  ON helpful_votes FOR SELECT USING (true);

-- Pueden eliminar su propio voto
CREATE POLICY "Users can delete own votes"
  ON helpful_votes FOR DELETE
  USING (auth.uid() = user_id);

-- POLICIES para 'favorites'
-- Usuarios autenticados pueden favoritar
CREATE POLICY "Authenticated users can favorite"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Pueden ver sus propios favoritos
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Pueden eliminar sus propios favoritos
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. DATA SEEDING (datos mínimos; la app usa consenso en place_accessibility_reviews)
-- ============================================================================

-- Crear un usuario demo
INSERT INTO users (id, email, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo@irtranquilo.com',
  'Demo User'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO places (
  name, category, address, latitude, longitude,
  created_by,
  photo_url
) VALUES
(
  'Café Plaza Italia', 'cafe',
  'Av. Italia 1200, Providencia',
  -33.4378, -70.6215,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL
),
(
  'Restaurante El Roble', 'restaurant',
  'Los Leones 3100, Ñuñoa',
  -33.4562, -70.6051,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL
),
(
  'Parque Bicentenario (acceso norte)', 'park',
  'Bicentenario 3800, Vitacura',
  -33.3944, -70.5989,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL
),
(
  'Clínica Andes', 'clinic',
  'Apoquindo 4500, Las Condes',
  -33.415, -70.594,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL
),
(
  'Mall Urbano (entrada oriente)', 'mall',
  'Vicuña Mackenna 6100, La Florida',
  -33.52, -70.598,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL
);

-- Una reseña demo por lugar (respeta uq_reviews_place_author)
INSERT INTO reviews (place_id, author_id, rating, comment) VALUES
(1, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Todo fluido con silla de ruedas.'),
(2, '00000000-0000-0000-0000-000000000001'::uuid, 3, 'Rampa portátil ok; baño complicado.'),
(3, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Parque muy accesible.'),
(4, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Edificio moderno, sin problemas.'),
(5, '00000000-0000-0000-0000-000000000001'::uuid, 3, 'Revisar mejor entrada.');

-- Checklist demo (una fila por reseña seed)
INSERT INTO place_accessibility_reviews (
  review_id, place_id,
  parking_available, parking_accessible, parking_near_entrance, signage_clear,
  step_free_access, ramp_available, elevator_available, entrance_width_ok,
  interior_spacious, wheelchair_table_access, accessible_bathroom, circulation_clear
)
SELECT r.id, r.place_id,
  true, true, true, true,
  true, true, false, true,
  true, true, true, true
FROM reviews r
WHERE r.place_id BETWEEN 1 AND 5
ON CONFLICT (review_id) DO NOTHING;

-- ============================================================================
-- Migración: ampliar enum place_category (BD ya creada con valores viejos)
-- Ejecuta en SQL Editor, una sentencia por vez si Postgres lo exige.
-- ============================================================================
-- ALTER TYPE place_category ADD VALUE 'gastronomy';
-- ALTER TYPE place_category ADD VALUE 'ice_cream';
-- ALTER TYPE place_category ADD VALUE 'winery';
-- ALTER TYPE place_category ADD VALUE 'store';
-- ALTER TYPE place_category ADD VALUE 'apparel';
-- ALTER TYPE place_category ADD VALUE 'home_goods';
-- ALTER TYPE place_category ADD VALUE 'bookstore';
-- ALTER TYPE place_category ADD VALUE 'pharmacy';
-- ALTER TYPE place_category ADD VALUE 'stadium';
-- ALTER TYPE place_category ADD VALUE 'museum';
-- ALTER TYPE place_category ADD VALUE 'convention_center';
-- ALTER TYPE place_category ADD VALUE 'health_services';
-- ALTER TYPE place_category ADD VALUE 'medical_office';
-- ALTER TYPE place_category ADD VALUE 'day_center';
-- ALTER TYPE place_category ADD VALUE 'therapeutic_school';
-- ALTER TYPE place_category ADD VALUE 'integration_center';
-- ALTER TYPE place_category ADD VALUE 'job_training';
-- ALTER TYPE place_category ADD VALUE 'education';
-- ALTER TYPE place_category ADD VALUE 'foundation';
-- ALTER TYPE place_category ADD VALUE 'bank';
-- ALTER TYPE place_category ADD VALUE 'airline';
-- ALTER TYPE place_category ADD VALUE 'hotel';
-- ALTER TYPE place_category ADD VALUE 'travel_agency';
-- ALTER TYPE place_category ADD VALUE 'energy';
-- ALTER TYPE place_category ADD VALUE 'automotive';
-- ALTER TYPE place_category ADD VALUE 'billing';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- El schema está listo. Ahora:
-- 1. Habilita la autenticación en Supabase
-- 2. Obtén la URL y ANON_KEY de Supabase
-- 3. Pégalas en el .env del proyecto React
-- ============================================================================
