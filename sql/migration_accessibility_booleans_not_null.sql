-- OBSOLETO (tabla place_accessibility_reviews eliminada). Solo referencia histórica.
-- Ejecutar en Supabase si place_accessibility_reviews ya existía con BOOLEAN NULL.
-- Convierte NULL → false y fuerza NOT NULL DEFAULT false en checklist.

UPDATE public.place_accessibility_reviews SET
  parking_available = COALESCE(parking_available, false),
  parking_accessible = COALESCE(parking_accessible, false),
  parking_near_entrance = COALESCE(parking_near_entrance, false),
  signage_clear = COALESCE(signage_clear, false),
  step_free_access = COALESCE(step_free_access, false),
  ramp_available = COALESCE(ramp_available, false),
  elevator_available = COALESCE(elevator_available, false),
  entrance_width_ok = COALESCE(entrance_width_ok, false),
  interior_spacious = COALESCE(interior_spacious, false),
  wheelchair_table_access = COALESCE(wheelchair_table_access, false),
  accessible_bathroom = COALESCE(accessible_bathroom, false),
  circulation_clear = COALESCE(circulation_clear, false);

ALTER TABLE public.place_accessibility_reviews
  ALTER COLUMN parking_available SET DEFAULT false,
  ALTER COLUMN parking_accessible SET DEFAULT false,
  ALTER COLUMN parking_near_entrance SET DEFAULT false,
  ALTER COLUMN signage_clear SET DEFAULT false,
  ALTER COLUMN step_free_access SET DEFAULT false,
  ALTER COLUMN ramp_available SET DEFAULT false,
  ALTER COLUMN elevator_available SET DEFAULT false,
  ALTER COLUMN entrance_width_ok SET DEFAULT false,
  ALTER COLUMN interior_spacious SET DEFAULT false,
  ALTER COLUMN wheelchair_table_access SET DEFAULT false,
  ALTER COLUMN accessible_bathroom SET DEFAULT false,
  ALTER COLUMN circulation_clear SET DEFAULT false;

ALTER TABLE public.place_accessibility_reviews
  ALTER COLUMN parking_available SET NOT NULL,
  ALTER COLUMN parking_accessible SET NOT NULL,
  ALTER COLUMN parking_near_entrance SET NOT NULL,
  ALTER COLUMN signage_clear SET NOT NULL,
  ALTER COLUMN step_free_access SET NOT NULL,
  ALTER COLUMN ramp_available SET NOT NULL,
  ALTER COLUMN elevator_available SET NOT NULL,
  ALTER COLUMN entrance_width_ok SET NOT NULL,
  ALTER COLUMN interior_spacious SET NOT NULL,
  ALTER COLUMN wheelchair_table_access SET NOT NULL,
  ALTER COLUMN accessible_bathroom SET NOT NULL,
  ALTER COLUMN circulation_clear SET NOT NULL;
