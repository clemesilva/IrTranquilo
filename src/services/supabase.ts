import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
    'En desarrollo: configúralas en .env.local. En Vercel: agrégalas en Settings → Environment Variables.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
