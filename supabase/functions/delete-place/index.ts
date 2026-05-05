import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = 'clementesilvavicuna@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verificar que el usuario es el admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return json({ error: 'No autorizado' }, 403);
    }

    const { placeId } = await req.json();
    if (!placeId) return json({ error: 'Falta placeId' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Obtener nombre del lugar para construir el path del storage
    const { data: place, error: placeErr } = await admin
      .from('places')
      .select('name')
      .eq('id', placeId)
      .single();
    if (placeErr || !place) return json({ error: 'Lugar no encontrado' }, 404);

    // Slugificar el nombre (misma lógica que reviewMediaPaths.ts)
    const slug = place.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 56);

    const prefix = `FotosyVideosReview/${slug}/`;

    // Listar archivos en el storage
    const { data: files } = await admin.storage
      .from('review-media')
      .list(prefix, { limit: 1000 });

    if (files && files.length > 0) {
      const paths = files.map((f) => `${prefix}${f.name}`);
      await admin.storage.from('review-media').remove(paths);
    }

    // Eliminar el lugar (cascada en DB borra reviews, etc.)
    const { error: deleteErr } = await admin
      .from('places')
      .delete()
      .eq('id', placeId);

    if (deleteErr) return json({ error: deleteErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
