import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '@/styles/colors';
import { AppIcons } from '@/components/icons/appIcons';
import { LogoPin } from '@/components/icons/LogoPin';

const P = '#1A56A0';

// ─── Tab 1: Acordeones de estándares ─────────────────────────────────────────

type Standard = {
  id: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  items: string[];
  source: string;
};

const STANDARDS: Standard[] = [
  {
    id: 'parking',
    emoji: '🅿️',
    icon: (
      <AppIcons.Accessibility
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Estacionamiento preferencial',
    items: [
      'Mínimo 1% del total de cajones, mínimo 2',
      'Dimensiones: 5m largo × 2,5m ancho + franja de 1,1m al costado',
      'Pendiente máxima del suelo: 2%',
      'Señalizado con Símbolo Internacional de Accesibilidad (SIA)',
      'Solo pueden usarlos personas con credencial del Registro Nacional de la Discapacidad',
    ],
    source: 'OGUC Art. 2.4.2, Ley 20.422 Art. 31',
  },
  {
    id: 'dogs',
    emoji: '🐕',
    icon: <AppIcons.PawPrint className='h-4 w-4' style={{ color: P }} aria-hidden />,
    title: 'Perros de asistencia',
    items: [
      'Derecho a ingresar con perro guía a todo edificio público o privado de uso público',
      'No se puede negar el acceso',
    ],
    source: 'Ley 20.422 Art. 28, Ley N°20.025',
  },
  {
    id: 'ramp',
    emoji: '📐',
    icon: (
      <AppIcons.TriangleRight
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Rampa accesible',
    items: [
      'Pendiente máxima 8% (hasta 12% en tramos de 1,5m)',
      'Ancho libre mínimo 1,2m',
      'Pasamanos a ambos lados a doble altura: 0,95m y 0,70m',
      'Sin desnivel en encuentro con calzada',
      'Libre de obstáculos antes y después',
    ],
    source: 'OGUC Art. 4.1.7 N°2',
  },
  {
    id: 'floor',
    emoji: '🦶',
    icon: (
      <AppIcons.Footprints
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Superficie antideslizante',
    items: [
      'Antideslizante en seco y en mojado',
      'Sin elementos sueltos ni irregulares',
      'Separaciones máximas de 1,5cm en rejillas o tapas',
    ],
    source: 'OGUC Art. 2.2.8, Art. 4.1.7',
  },
  {
    id: 'route',
    emoji: '✅',
    icon: (
      <AppIcons.Route className='h-4 w-4' style={{ color: P }} aria-hidden />
    ),
    title: 'Ruta continua sin obstáculos',
    items: [
      'Ancho mínimo 1,2m en edificaciones, 2m en espacios públicos',
      'Altura libre mínima 2,1m',
      'Sin gradas, obstáculos ni barreras',
      'Pavimento estable y homogéneo',
    ],
    source: 'OGUC Art. 2.2.8, Art. 4.1.7',
  },
  {
    id: 'entrance',
    emoji: '🚪',
    icon: (
      <AppIcons.DoorOpen className='h-4 w-4' style={{ color: P }} aria-hidden />
    ),
    title: 'Entrada ancha',
    items: [
      'Vano mínimo 0,90m',
      'Ancho libre mínimo 0,80m',
      'Preferentemente abre hacia afuera',
    ],
    source: 'OGUC Art. 4.1.7 N°6',
  },
  {
    id: 'elevator',
    emoji: '🛗',
    icon: (
      <AppIcons.SquareArrowUp
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Ascensor',
    items: [
      'Cabina mínima: 1,10m ancho × 1,40m largo × 2,20m alto',
      'Puerta: 0,90m ancho libre',
      'Botones entre 0,90m y 1,20m de altura',
      'Señal audible en cada piso',
      'Espejo si no se puede girar dentro',
      'Espacio frente a puerta: mínimo 1,5m × 1,5m',
    ],
    source: 'OGUC Art. 4.1.7 N°3, Art. 4.1.11',
  },
  {
    id: 'circulation',
    emoji: '↔️',
    icon: (
      <AppIcons.MoveHorizontal
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Circulación amplia',
    items: [
      'Ancho mínimo 1,2m libre de obstáculos',
      'Espacio para girar silla de ruedas: círculo de 1,5m de diámetro',
    ],
    source: 'OGUC Art. 4.1.7',
  },
  {
    id: 'counter',
    emoji: '🪑',
    icon: (
      <AppIcons.MoveRight
        className='h-4 w-4'
        style={{ color: P }}
        aria-hidden
      />
    ),
    title: 'Mesón de pago rebajado',
    items: [
      'Altura máxima sobre cubierta: 0,80m',
      'Espacio libre bajo cubierta: 0,70m mínimo',
      'Largo mínimo del tramo rebajado: 1,2m',
      'Ancho mínimo: 0,60m',
    ],
    source: 'OGUC Art. 4.1.7, Ciudad Accesible Ficha 6',
  },
  {
    id: 'bathroom',
    emoji: '🚻',
    icon: (
      <AppIcons.Toilet className='h-4 w-4' style={{ color: P }} aria-hidden />
    ),
    title: 'Baño accesible',
    items: [
      'Espacio interior para girar silla de ruedas: círculo de 1,5m diámetro',
      'Puerta abre hacia afuera, ancho libre 0,80m',
      'Lavamanos: altura 0,80m, espacio libre bajo él 0,70m, grifería de palanca o sensor',
      'Inodoro: altura de asiento 0,46m a 0,48m, espacio de transferencia lateral 0,80m × 1,20m',
      'Barras de apoyo: largo mínimo 0,60m, altura 0,75m',
      'Accesorios: máximo a 1,20m de altura',
      'Señalizado con SIA',
    ],
    source: 'OGUC Art. 4.1.7 N°6',
  },
  {
    id: 'table',
    emoji: '🍽️',
    icon: (
      <AppIcons.Utensils className='h-4 w-4' style={{ color: P }} aria-hidden />
    ),
    title: 'Mesa comedor accesible',
    items: [
      'Altura libre bajo la mesa: mínimo 0,70m',
      'Ancho libre bajo la mesa: mínimo 0,90m',
      'Pasillo hacia las mesas: mínimo 0,90m de ancho',
    ],
    source: 'Ciudad Accesible Ficha 6',
  },
];

function AccordionItem({ standard }: { standard: Standard }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className='rounded-2xl border bg-white shadow-sm overflow-hidden'
      style={{ borderColor: open ? `${P}40` : `${P}15` }}
    >
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/40'
        aria-expanded={open}
      >
        <div
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl'
          style={{ backgroundColor: `${P}12` }}
        >
          {standard.icon}
        </div>
        <span className='flex-1 text-sm font-semibold text-neutral-900 leading-snug'>
          {standard.title}
        </span>
        <AppIcons.ChevronDown
          className='h-4 w-4 shrink-0 transition-transform duration-200'
          style={{
            color: P,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className='px-4 pb-4 space-y-2'
          style={{ borderTop: `1px solid ${P}15` }}
        >
          <ul className='mt-3 space-y-2'>
            {standard.items.map((item) => (
              <li key={item} className='flex items-start gap-2.5'>
                <span
                  className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full'
                  style={{ backgroundColor: P }}
                />
                <span className='text-sm text-neutral-700 leading-relaxed'>
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <p className='mt-3 text-xs font-medium' style={{ color: `${P}99` }}>
            Fuente: {standard.source}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Marco Legal ───────────────────────────────────────────────────────

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      className='flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:opacity-80'
      style={{ borderColor: `${P}30`, color: P, backgroundColor: `${P}08` }}
    >
      <AppIcons.Globe className='h-4 w-4 shrink-0' aria-hidden />
      <span className='flex-1 leading-snug'>{label}</span>
      <AppIcons.ExternalLink
        className='h-3.5 w-3.5 shrink-0 opacity-50'
        aria-hidden
      />
    </a>
  );
}

function SectionCard({
  icon,
  tag,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className='rounded-2xl border bg-white p-5 shadow-sm space-y-4'
      style={{ borderColor: `${P}20` }}
    >
      <div className='flex items-start gap-3'>
        <div
          className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'
          style={{ backgroundColor: `${P}12` }}
        >
          {icon}
        </div>
        <div>
          <p
            className='text-[11px] font-bold uppercase tracking-wider'
            style={{ color: P }}
          >
            {tag}
          </p>
          <p className='text-sm font-semibold leading-snug text-neutral-900'>
            {title}
          </p>
          {subtitle && (
            <p className='mt-0.5 text-xs text-neutral-500'>{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'standards' | 'legal';

export function MarcoLegalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('standards');

  return (
    <div
      className='min-h-screen'
      style={{ backgroundColor: COLORS.background }}
    >
      {/* Header */}
      <header
        className='sticky top-0 z-10 border-b bg-white/90 backdrop-blur'
        style={{ borderColor: `${P}20` }}
      >
        <div className='flex max-w-none items-center gap-3 px-4 py-3 md:px-28 md:py-5'>
          <button
            type='button'
            onClick={() => navigate(-1)}
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50'
            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}
            aria-label='Volver'
          >
            <AppIcons.ArrowLeft className='h-4 w-4' aria-hidden />
          </button>
          <div className='flex items-center gap-2'>
            <LogoPin size={24} />
            <span className='text-sm font-bold' style={{ color: COLORS.text }}>
              AndaTranquilo
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className='px-4 pb-2 md:px-28 md:pb-4'>
          <div className='flex gap-1'>
            {(
              [
                { id: 'standards' as Tab, label: 'Estándares' },
                { id: 'legal' as Tab, label: 'Fuentes y Marco Legal' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type='button'
                onClick={() => setTab(id)}
                className='relative px-4 py-2.5 text-sm font-semibold transition-colors'
                style={{
                  color: tab === id ? P : COLORS.textMuted,
                }}
              >
                {label}
                {tab === id && (
                  <span
                    className='absolute bottom-0 left-0 right-0 h-0.5 rounded-t'
                    style={{ backgroundColor: P }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className='px-6 pt-8 pb-6 space-y-6'>
        {/* ── Tab 1: Estándares ── */}
        {tab === 'standards' && (
          <div className='mx-auto max-w-screen-xl'>
            <div className='space-y-1.5'>
              <h1
                className='text-2xl font-extrabold'
                style={{ color: COLORS.text }}
              >
                Estándares de accesibilidad
              </h1>
              <p
                className='text-sm leading-relaxed'
                style={{ color: COLORS.textMuted }}
              >
                Especificaciones técnicas según la normativa chilena vigente.
                Toca cada ítem para ver el detalle.
              </p>
            </div>

            <div className='mt-6 flex flex-col gap-2 md:flex-row md:items-start'>
              <div className='flex flex-col gap-2 md:flex-1'>
                {STANDARDS.filter((_, i) => i % 2 === 0).map((s) => (
                  <AccordionItem key={s.id} standard={s} />
                ))}
              </div>
              <div className='flex flex-col gap-2 md:flex-1'>
                {STANDARDS.filter((_, i) => i % 2 !== 0).map((s) => (
                  <AccordionItem key={s.id} standard={s} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Marco Legal ── */}
        {tab === 'legal' && (
          <div className='mx-auto max-w-screen-xl'>
            <div className='space-y-1.5'>
              <h1
                className='text-2xl font-extrabold'
                style={{ color: COLORS.text }}
              >
                Base Legal y Fuentes
              </h1>
              <p
                className='text-sm leading-relaxed'
                style={{ color: COLORS.textMuted }}
              >
                Los criterios de accesibilidad de AndaTranquilo están basados en
                la legislación chilena vigente y documentación técnica oficial.
              </p>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <SectionCard
                icon={
                  <AppIcons.Scale
                    className='h-4 w-4'
                    style={{ color: P }}
                    aria-hidden
                  />
                }
                tag='Ley 20.422'
                title='Establece Normas sobre Igualdad de Oportunidades e Inclusión Social de Personas con Discapacidad'
                subtitle='Publicada: 10 de febrero de 2010'
              >
                <LinkButton
                  href='https://www.bcn.cl/leychile/navegar?idNorma=1010903'
                  label='Ver ley completa en BCN'
                />
              </SectionCard>

              <SectionCard
                icon={
                  <AppIcons.Building2
                    className='h-4 w-4'
                    style={{ color: P }}
                    aria-hidden
                  />
                }
                tag='Normativa de Urbanismo y Construcción'
                title='Normativa Accesibilidad Universal OGUC Chile'
                subtitle='Síntesis Dibujada v.2023 — Corporación Ciudad Accesible'
              >
                <LinkButton
                  href='https://www.ciudadaccesible.cl/oguc-ilustrada-accesibilidad/'
                  label='Ver normativa OGUC ilustrada'
                />
              </SectionCard>

              <SectionCard
                icon={
                  <AppIcons.PawPrint
                    className='h-4 w-4'
                    style={{ color: P }}
                    aria-hidden
                  />
                }
                tag='Perros de Servicio'
                title='Regulación del uso de Perros Guías, de Señal o Servicio para Personas con Discapacidad'
              >
                <div className='space-y-2'>
                  <LinkButton
                    href='https://www.bcn.cl/leychile/navegar?idNorma=239523&buscar=20025'
                    label='Ley N°20.025 — Perros Guías y de Servicio'
                  />
                </div>
              </SectionCard>

              <SectionCard
                icon={
                  <AppIcons.Car
                    className='h-4 w-4'
                    style={{ color: P }}
                    aria-hidden
                  />
                }
                tag='Estacionamientos Reservados'
                title='Ley N°19.900 — Estacionamientos para Personas con Discapacidad'
                subtitle='Solo personas con credencial del Registro Nacional de la Discapacidad. Infracción GRAVE (Art. 200 N°28 Ley de Tránsito).'
              >
                <LinkButton
                  href='https://www.ciudadaccesible.cl'
                  label='Fuente: ciudadaccesible.cl'
                />
              </SectionCard>

              <SectionCard
                icon={
                  <AppIcons.BookOpen
                    className='h-4 w-4'
                    style={{ color: P }}
                    aria-hidden
                  />
                }
                tag='Documentación técnica'
                title='Fichas de referencia — Corporación Ciudad Accesible'
              >
                <LinkButton
                  href='https://www.ciudadaccesible.cl/wp-content/uploads/2021/04/Ficha-6-Comercio-y-Servcios-Accesibles-2021.pdf'
                  label='Ficha 6: Comercio y Servicios Accesibles'
                />
              </SectionCard>
            </div>

            {/* Notas importantes */}
            <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3'>
              <div className='flex items-center gap-2'>
                <AppIcons.TriangleAlert
                  className='h-4 w-4 shrink-0 text-amber-700'
                  aria-hidden
                />
                <p className='text-sm font-bold text-amber-900'>
                  Notas importantes
                </p>
              </div>
              {[
                'Cualquier persona puede denunciar el incumplimiento ante el Juzgado de Policía Local.',
                'Las multas por incumplimiento van de 10 a 120 UTM.',
                'La fiscalización corresponde a las Direcciones de Obras Municipales.',
              ].map((note) => (
                <div key={note} className='flex items-start gap-2.5'>
                  <span className='mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600' />
                  <p className='text-sm text-amber-900 leading-relaxed'>
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className='pb-4 text-center text-xs text-neutral-400'>
          AndaTranquilo · Información legal vigente en Chile
        </p>
      </main>
    </div>
  );
}
