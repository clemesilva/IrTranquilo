import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upsert user profile in users table
  const upsertUserProfile = useCallback(async (authUser: User) => {
    try {
      const displayName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.display_name ||
        authUser.email?.split('@')[0] ||
        'Usuario';

      const { error } = await supabase.from('users').upsert(
        {
          id: authUser.id,
          email: authUser.email,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }, // Si ya existe, actualizar
      );

      if (error) {
        console.error('Error upserting user profile:', error);
      }
    } catch (err) {
      console.error('Error in upsertUserProfile:', err);
    }
  }, []);

  // Check initial session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await upsertUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        upsertUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [upsertUserProfile]);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      // En registro, forzamos a que el usuario NO quede autenticado aquí.
      // (El flujo esperado es confirmar email y luego iniciar sesión).
      if (data.session) {
        await supabase.auth.signOut();
      }
      setUser(null);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.user) setUser(data.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [user, isLoading, signUp, signIn, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
