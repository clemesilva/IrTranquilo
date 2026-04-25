import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useAuth } from '@/context/useAuth';
import { COLORS } from '@/styles/colors';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onSuccess?: () => void;
}

export function LoginDialog({ open, onOpenChange, title, onSuccess }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email, password);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar con Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[calc(100vw-2rem)] max-w-md rounded-2xl p-8' overlayClassName='bg-transparent'>
        <VisuallyHidden>
          <DialogTitle>Iniciar sesión</DialogTitle>
        </VisuallyHidden>

        <div className='mb-5'>
          <h2 className='text-xl font-bold' style={{ color: COLORS.text }}>
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          {title && (
            <p className='mt-1 text-sm' style={{ color: COLORS.textMuted }}>
              {title}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {isSignUp && (
            <div className='space-y-1.5'>
              <Label className='text-sm font-semibold' style={{ color: COLORS.text }}>
                Nombre
              </Label>
              <Input
                type='text'
                placeholder='Tu nombre'
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                className='rounded-xl border-2 h-11 focus-visible:ring-0'
                style={{ borderColor: COLORS.border }}
              />
            </div>
          )}
          <div className='space-y-1.5'>
            <Label className='text-sm font-semibold' style={{ color: COLORS.text }}>
              Email
            </Label>
            <Input
              type='email'
              placeholder='tu@email.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className='rounded-xl border-2 h-11 focus-visible:ring-0'
              style={{ borderColor: COLORS.border }}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-sm font-semibold' style={{ color: COLORS.text }}>
              Contraseña
            </Label>
            <Input
              type='password'
              placeholder='••••••••'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className='rounded-xl border-2 h-11 focus-visible:ring-0'
              style={{ borderColor: COLORS.border }}
            />
          </div>

          {error && (
            <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {error}
            </div>
          )}

          <button
            type='submit'
            disabled={isLoading}
            className='w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60'
            style={{ backgroundColor: COLORS.primary }}
          >
            {isLoading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <div className='relative my-4'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t' style={{ borderColor: COLORS.border }} />
          </div>
          <div className='relative flex justify-center text-xs'>
            <span className='bg-white px-3' style={{ color: COLORS.textMuted }}>
              O continúa con
            </span>
          </div>
        </div>

        <button
          type='button'
          onClick={handleGoogle}
          disabled={isGoogleLoading}
          className='w-full flex items-center justify-center gap-2.5 rounded-xl border-2 py-3 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-60'
          style={{ borderColor: COLORS.border, color: COLORS.text }}
        >
          <svg className='h-4 w-4' viewBox='0 0 24 24'>
            <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
            <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
            <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05' />
            <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
          </svg>
          {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <p className='mt-4 text-center text-sm' style={{ color: COLORS.textMuted }}>
          {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
          <button
            type='button'
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className='font-semibold hover:underline'
            style={{ color: COLORS.primary }}
          >
            {isSignUp ? 'Inicia sesión' : 'Crea una gratis'}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
