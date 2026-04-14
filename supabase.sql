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

  -- Descripción
  description TEXT,

  -- Creador del lugar
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Flags de accesibilidad (Quick filters)
  accessible_parking BOOLEAN DEFAULT FALSE,
  accessible_entrance BOOLEAN DEFAULT FALSE,
  adapted_restroom BOOLEAN DEFAULT FALSE,

  -- Detalles de llegada
  arrival_accessible_parking TEXT,
  arrival_proximity TEXT,
  arrival_availability TEXT,

  -- Detalles de entrada
  entrance_no_steps BOOLEAN DEFAULT FALSE,
  entrance_ramp BOOLEAN DEFAULT FALSE,
  entrance_access_note TEXT,

  -- Detalles interiores
  interior_space TEXT,
  interior_restroom TEXT,
  interior_elevator TEXT,

  -- Foto (URL)
  photo_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Rating calculado (Desnormalizado para query performance)
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
-- 9. DATA SEEDING (Datos iniciales - igual a mockPlaces.ts)
-- ============================================================================

-- Crear un usuario demo
INSERT INTO users (id, email, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo@irtranquilo.com',
  'Demo User'
)
ON CONFLICT (id) DO NOTHING;

-- Insertar los 5 lugares de demo
INSERT INTO places (
  name, category, address, latitude, longitude,
  created_by,
  accessible_parking, accessible_entrance, adapted_restroom,
  arrival_accessible_parking, arrival_proximity, arrival_availability,
  entrance_no_steps, entrance_ramp, entrance_access_note,
  interior_space, interior_restroom, interior_elevator,
  photo_url
) VALUES
-- Café Plaza Italia
(
  'Café Plaza Italia', 'cafe',
  'Av. Italia 1200, Providencia',
  -33.4378, -70.6215,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true, true, true,
  'Dos cupos reservados junto a la entrada.',
  'A 200 m de parada de metro accesible.',
  'Suele haber cupo en horario valle.',
  true, true, 'Rampa con pendiente suave y mano continua.',
  'Mesas con pasillo amplio entre filas.',
  'Baño unisex adaptado verificado por usuarios.',
  'No aplica (planta baja).',
  NULL
),
-- Restaurante El Roble
(
  'Restaurante El Roble', 'restaurant',
  'Los Leones 3100, Ñuñoa',
  -33.4562, -70.6051,
  '00000000-0000-0000-0000-000000000001'::uuid,
  false, true, false,
  'Sin estacionamiento propio; calle con rampa verde cercana.',
  'Entrada principal sobre vereda nivelada.',
  'Reservar mesa en planta baja recomendado.',
  false, true, 'Un escalón de 8 cm compensado con rampa portátil.',
  'Sector planta baja aceptable; salón superior solo por escaleras.',
  'Baño pequeño, sin barras de apoyo reportadas.',
  'No disponible.',
  NULL
),
-- Parque Bicentenario
(
  'Parque Bicentenario (acceso norte)', 'park',
  'Bicentenario 3800, Vitacura',
  -33.3944, -70.5989,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true, true, true,
  'Estacionamiento con cupos señalizados.',
  'Sendero principal continuo desde el estacionamiento.',
  'Fin de semana puede llenarse temprano.',
  true, false, 'Acceso plano sin desniveles relevantes.',
  'Amplios caminos pavimentados; algunas zonas de césped blando.',
  'Baños públicos adaptados en módulo central.',
  'No aplica.',
  NULL
),
-- Clínica Andes
(
  'Clínica Andes', 'clinic',
  'Apoquindo 4500, Las Condes',
  -33.415, -70.594,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true, true, true,
  'Subterráneo con ascensor desde cupos señalizados.',
  'Acceso directo desde estacionamiento a recepción.',
  'Cupos limitados en horario punta.',
  true, true, 'Puertas automáticas y contrapiso sin desnivel.',
  'Pasillos amplios; mostradores con altura mixta.',
  'Baños adaptados en cada piso con ascensor.',
  'Ascensores con ancho para silla y botonería baja.',
  NULL
),
-- Mall Urbano
(
  'Mall Urbano (entrada oriente)', 'mall',
  'Vicuña Mackenna 6100, La Florida',
  -33.52, -70.598,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true, false, true,
  'Cupos en varios niveles; ascensor de vehículo operativo.',
  'Entrada oriente con vereda en reparación según reportes.',
  'Mejor acceso por entrada poniente.',
  false, false, 'Escalones fijos en acceso oriente; alternativa poniente con rampa.',
  'Pasillos estándar de mall.',
  'Baños adaptados en food court.',
  'Ascensores públicos en buen estado.',
  NULL
)
ON CONFLICT DO NOTHING;

-- Insertar reseñas demo
INSERT INTO reviews (place_id, author_id, rating, comment) VALUES
(1, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Todo fluido con silla de ruedas.'),
(1, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Baño impecable y amplio.'),
(1, '00000000-0000-0000-0000-000000000001'::uuid, 4, 'Un poco ruidoso pero accesible.'),
(2, '00000000-0000-0000-0000-000000000001'::uuid, 4, 'Rampa portátil ok, hay que avisar al llegar.'),
(2, '00000000-0000-0000-0000-000000000001'::uuid, 3, 'Baño no adaptado, complicado.'),
(3, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Parque muy accesible, lo recomiendo.'),
(3, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Estacionamiento y baños bien señalizados.'),
(4, '00000000-0000-0000-0000-000000000001'::uuid, 5, 'Edificio moderno, sin problemas.'),
(4, '00000000-0000-0000-0000-000000000001'::uuid, 4, 'Ascensor a veces colapsado en punta.'),
(5, '00000000-0000-0000-0000-000000000001'::uuid, 3, 'Entrada oriente es un problema.'),
(5, '00000000-0000-0000-0000-000000000001'::uuid, 3, 'Usar otra entrada si van con silla.')
ON CONFLICT DO NOTHING;

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
