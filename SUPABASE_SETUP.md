# Setup Supabase - Paso a paso

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en **"New Project"**
3. Llena los datos:
   - **Name**: `irtranquilo`
   - **Password**: Crea una contraseña fuerte (guárdala!)
   - **Region**: Elige la más cercana a Chile (São Paulo es OK)
4. Espera a que se cree (unos 2-3 min)

---

## 2. Ejecutar el SQL

1. Una vez creado, haz clic en tu proyecto
2. Ve a **SQL Editor** (lado izquierdo)
3. Haz clic en **"New Query"**
4. **Copia TODO el contenido** de `supabase.sql` en este proyecto
5. Pégalo en la ventana de SQL Editor
6. Haz clic en **"Run"** (triangulito verde)

**Debe mostrar**: Success - sin errores

---

## 3. Obtener credenciales

1. Ve a **Settings** > **API** (lado izquierdo)
2. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Public API Key** (anon): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 4. Configurar .env en el proyecto React

Crea un archivo `.env.local` en la raíz del proyecto (junto a package.json):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5173
```

**IMPORTANTE**:

- `.env.local` NO se commitea (ya está en `.gitignore`)
- Los otros .env van en el `.env.example` para documentación

---

## 5️⃣ Setup Autenticación en Supabase

Supabase usa tu **auth schema** por defecto. Necesitas habilitar email/password:

1. Ve a **Authentication** > **Providers** (lado izquierdo)
2. Busca **Email** - asegúrate que esté enabled
3. Ve a **Auth Settings** > **Email Templates**
   - Verifica que tenga templates (por defecto sí)

---

## 6️⃣ Instalar Supabase Client

En tu proyecto React:

```bash
npm install @supabase/supabase-js
```

---

## 7️⃣ Crear Supabase Client

Crea `src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 8️⃣ Crear AuthProvider

Crea `src/context/AuthProvider.tsx`:

```typescript
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

Crea `src/context/useAuth.ts`:

```typescript
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

---

## 9️⃣ Actualizar App.tsx

```tsx
import { AuthProvider } from './context/AuthProvider';
import { PlacesProvider } from './context/PlacesProvider';
import { MainLayout } from './layouts/MainLayout';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <AuthProvider>
      <PlacesProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<MainLayout />}>
              {/* ... resto de rutas ... */}
            </Route>
          </Routes>
        </BrowserRouter>
      </PlacesProvider>
    </AuthProvider>
  );
}
```

---

## ¿Cómo verificar que funciona?

Prueba en la consola del navegador:

```javascript
import { supabase } from './services/supabase';

// Ver todos los lugares
const { data, error } = await supabase.from('places').select('*');

console.log(data); // Debe mostrar los 5 lugares
```

---

## Notas importantes

- **RLS está habilitado**: Solo usuarios autenticados pueden crear lugares/reseñas
- **Los datos de demo**: Ya vienen insertados (5 lugares + reviews)
- **Triggers automáticos**: El rating se recalcula solo
- **Auth**: Supabase maneja users en la tabla `auth.users` (sistema interno)

---

## Siguiente paso

Una vez que Supabase esté configurado, actualizaremos `PlacesProvider.tsx` para conectarse a la BD real.

¿Listo?
