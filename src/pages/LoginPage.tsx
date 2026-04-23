import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/useAuth';
import { COLORS } from '../styles/colors';
import { AppIcons } from '@/components/icons/appIcons';
import { LogoPin } from '@/components/icons/LogoPin';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast.success(
          'Cuenta creada. Te va a llegar un mail de confirmación para activar tu cuenta.',
        );
        setIsSignUp(false);
        setPassword('');
        navigate('/login', { replace: true });
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al iniciar con Google',
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className='flex min-h-screen'
      style={{ backgroundColor: COLORS.background }}
    >
      {/* Panel izquierdo — solo desktop */}
      <div
        className='hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 p-16'
        style={{
          background: 'linear-gradient(160deg, #5b9bd5 0%, #2a6db5 40%, #1A56A0 70%, #1a3a6b 100%)',
        }}
      >
        {/* Logo */}
        <div className='flex flex-col items-center gap-5 text-center'>
          <div className='flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm'>
            <LogoPin size={60} />
          </div>
          <div>
            <h1 className='text-4xl font-extrabold text-white'>AndaTranquilo</h1>
            <p className='mt-2 text-lg text-white/70'>
              Anda tranquilo, nosotros ya fuimos.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className='flex flex-col gap-4 w-full max-w-sm'>
          {[
            {
              icon: AppIcons.Search,
              text: 'Encuentra lugares con información de accesibilidad',
            },
            {
              icon: AppIcons.ClipboardList,
              text: 'Evalúa rampas, ascensores y entradas adaptadas',
            },
            {
              icon: AppIcons.Share2,
              text: 'Contribuye y ayuda a otros a moverse con libertad',
            },
          ].map((item) => (
            <div key={item.text} className='flex items-start gap-3'>
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15'>
                <item.icon size={16} className='text-white' />
              </div>
              <p className='text-sm text-white/80 leading-relaxed'>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <p className='text-xs text-white/40 mt-4'>
          © 2024 AndaTranquilo · Santiago, Chile
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className='flex flex-1 flex-col items-center justify-center px-6 py-12'>
        {/* Logo mobile */}
        <div className='mb-8 flex flex-col items-center gap-3 lg:hidden'>
          <div className='flex h-14 w-14 items-center justify-center'>
            <LogoPin size={40} />
          </div>
          <span
            className='text-xl font-extrabold'
            style={{ color: COLORS.text }}
          >
            AndaTranquilo
          </span>
        </div>

        <div
          className='w-full max-w-sm rounded-3xl border bg-white p-8 shadow-lg'
          style={{ borderColor: `${COLORS.primary}20` }}
        >
          {/* Título */}
          <div className='mb-7'>
            <h2
              className='text-2xl font-extrabold'
              style={{ color: COLORS.text }}
            >
              {isSignUp ? 'Crear cuenta' : 'Bienvenido'}
            </h2>
            <p className='mt-1 text-sm' style={{ color: COLORS.textMuted }}>
              {isSignUp
                ? 'Únete a la comunidad de AndaTranquilo'
                : 'Inicia sesión para continuar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {isSignUp && (
              <div className='space-y-1.5'>
                <Label
                  htmlFor='display-name'
                  className='text-sm font-semibold'
                  style={{ color: COLORS.text }}
                >
                  Nombre
                </Label>
                <Input
                  id='display-name'
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
              <Label
                htmlFor='email'
                className='text-sm font-semibold'
                style={{ color: COLORS.text }}
              >
                Email
              </Label>
              <Input
                id='email'
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
              <Label
                htmlFor='password'
                className='text-sm font-semibold'
                style={{ color: COLORS.text }}
              >
                Contraseña
              </Label>
              <Input
                id='password'
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
              className='mt-2 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60'
              style={{ backgroundColor: COLORS.primary }}
            >
              {isLoading
                ? 'Cargando...'
                : isSignUp
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divider */}
          <div className='relative my-5'>
            <div className='absolute inset-0 flex items-center'>
              <div
                className='w-full border-t'
                style={{ borderColor: COLORS.border }}
              />
            </div>
            <div className='relative flex justify-center text-xs'>
              <span
                className='bg-white px-3'
                style={{ color: COLORS.textMuted }}
              >
                O continúa con
              </span>
            </div>
          </div>

          {/* Google */}
          <button
            type='button'
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className='w-full flex items-center justify-center gap-2.5 rounded-xl border-2 py-3 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-60'
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            <svg className='h-4 w-4' viewBox='0 0 24 24'>
              <path
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                fill='#4285F4'
              />
              <path
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                fill='#34A853'
              />
              <path
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                fill='#FBBC05'
              />
              <path
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                fill='#EA4335'
              />
            </svg>
            {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          {/* Toggle login/signup */}
          <p
            className='mt-5 text-center text-sm'
            style={{ color: COLORS.textMuted }}
          >
            {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <button
              type='button'
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className='font-semibold hover:underline'
              style={{ color: COLORS.primary }}
            >
              {isSignUp ? 'Inicia sesión' : 'Crea una gratis'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
