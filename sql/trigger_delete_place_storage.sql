-- Trigger: al eliminar un place, borra la carpeta de review-media en Storage.
--
-- REQUISITO: ejecuta esto UNA VEZ para guardar tus credenciales en la BD:
--
--   ALTER DATABASE postgres
--     SET app.settings.supabase_url = 'https://TU_PROJECT_REF.supabase.co';
--
--   ALTER DATABASE postgres
--     SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY';
--
-- Ambos valores los encuentras en: Supabase Dashboard → Settings → API
-- -----------------------------------------------------------------------

-- 1. Función que slugifica el nombre del lugar (misma lógica que reviewMediaPaths.ts)
CREATE OR REPLACE FUNCTION slugify_place_name(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(trim(unaccent(name))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    ),
    '.{57,}', substr(lower(trim(unaccent(name))), 1, 56), ''
  );
$$;

-- 2. Función del trigger: lista todos los archivos de la carpeta y los elimina
CREATE OR REPLACE FUNCTION delete_place_storage_folder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slug      text;
  v_prefix    text;
  v_url       text;
  v_key       text;
  v_list_resp jsonb;
  v_names     text[];
  v_prefixes  jsonb;
BEGIN
  v_slug   := slugify_place_name(OLD.name);
  v_prefix := 'FotosyVideosReview/' || v_slug || '/';
  v_url    := current_setting('app.settings.supabase_url', true);
  v_key    := current_setting('app.settings.service_role_key', true);

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'delete_place_storage_folder: faltan app.settings (supabase_url / service_role_key)';
    RETURN OLD;
  END IF;

  -- Listar archivos en la carpeta
  SELECT content::jsonb
  INTO v_list_resp
  FROM net.http_post(
    url     := v_url || '/storage/v1/object/list/review-media',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'prefix', v_prefix,
      'limit',  1000
    )
  );

  -- Construir array de prefijos a eliminar
  SELECT array_agg(v_prefix || (obj->>'name'))
  INTO v_names
  FROM jsonb_array_elements(v_list_resp) AS obj;

  IF v_names IS NULL OR array_length(v_names, 1) = 0 THEN
    RETURN OLD;
  END IF;

  SELECT jsonb_agg(to_jsonb(n))
  INTO v_prefixes
  FROM unnest(v_names) AS n;

  -- Eliminar archivos
  PERFORM net.http_delete(
    url     := v_url || '/storage/v1/object/review-media',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object('prefixes', v_prefixes)
  );

  RETURN OLD;
END;
$$;

-- 3. Activar el trigger
DROP TRIGGER IF EXISTS trg_delete_place_storage ON places;

CREATE TRIGGER trg_delete_place_storage
  AFTER DELETE ON places
  FOR EACH ROW
  EXECUTE FUNCTION delete_place_storage_folder();
