import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { COLORS } from '@/styles/colors';

const LEVELS = [
  {
    stars: 5,
    label: 'Muy accesible',
    color: '#16a34a',
    description: 'El lugar tiene rampas, ascensores, baños adaptados, señalética clara y circulación sin obstáculos. Una persona con movilidad reducida puede usarlo de forma completamente autónoma.',
  },
  {
    stars: 4,
    label: 'Accesible',
    color: '#65a30d',
    description: 'Cuenta con la mayoría de las condiciones de accesibilidad. Puede haber algún detalle menor que dificulte la experiencia, pero en general es cómodo y autónomo.',
  },
  {
    stars: 3,
    label: 'Parcialmente accesible',
    color: '#d97706',
    description: 'Tiene algunas facilidades pero también barreras importantes. Se puede entrar y moverse, pero con dificultad o con ayuda en ciertas áreas.',
  },
  {
    stars: 2,
    label: 'Poco accesible',
    color: '#ea580c',
    description: 'Hay barreras significativas: escalones sin rampa, baños no adaptados, pasillos angostos. Es difícil o imposible moverse de forma autónoma.',
  },
  {
    stars: 1,
    label: 'Inaccesible',
    color: '#dc2626',
    description: 'El lugar no tiene condiciones mínimas de accesibilidad. Una persona en silla de ruedas u otras condiciones de movilidad no puede acceder o usarlo.',
  },
];

interface RatingExplainerDialogProps {
  open: boolean;
  initialRating: number;
  onConfirm: (rating: number) => void;
  onCancel: () => void;
}

export function RatingExplainerDialog({
  open,
  initialRating,
  onConfirm,
  onCancel,
}: RatingExplainerDialogProps) {
  const [selected, setSelected] = useState(initialRating || 0);

  useEffect(() => {
    if (open) setSelected(initialRating || 0);
  }, [open, initialRating]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className='w-[calc(100vw-2rem)] max-w-md rounded-2xl p-0 overflow-hidden' overlayClassName='backdrop-blur-sm bg-black/30'>
        <DialogTitle className='sr-only'>Calificación de accesibilidad</DialogTitle>

        {/* Header */}
        <div className='px-6 pt-6 pb-4 border-b' style={{ borderColor: `${COLORS.primary}20` }}>
          <h2 className='text-lg font-bold' style={{ color: COLORS.text }}>¿Qué tan accesible es?</h2>
          <p className='text-sm mt-1' style={{ color: COLORS.textMuted }}>
            Antes de calificar, esto es lo que significa cada nivel:
          </p>
        </div>

        {/* Niveles */}
        <div className='px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto'>
          {LEVELS.map((level) => (
            <button
              key={level.stars}
              type='button'
              onClick={() => setSelected(selected === level.stars ? 0 : level.stars)}
              className='w-full text-left rounded-xl border-2 px-4 py-3 transition-all'
              style={{
                borderColor: selected === level.stars ? level.color : '#E5E7EB',
                backgroundColor: selected === level.stars ? `${level.color}10` : 'white',
              }}
            >
              <div className='flex items-center gap-2 mb-1'>
                <div className='flex'>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      strokeWidth={i < level.stars ? 0 : 1.5}
                      style={{
                        fill: i < level.stars ? level.color : 'transparent',
                        color: i < level.stars ? level.color : '#D1D5DB',
                      }}
                    />
                  ))}
                </div>
                <span className='text-sm font-semibold' style={{ color: level.color }}>
                  {level.label}
                </span>
              </div>
              <p className='text-xs leading-relaxed' style={{ color: COLORS.textMuted }}>
                {level.description}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className='px-6 pb-6 pt-3 border-t space-y-2' style={{ borderColor: '#F3F4F6' }}>
          <Button
            type='button'
            className='w-full font-semibold h-11'
            disabled={selected === 0}
            onClick={() => onConfirm(selected)}
            style={{
              backgroundColor: selected > 0 ? COLORS.primary : undefined,
              color: selected > 0 ? '#fff' : undefined,
            }}
          >
            {selected === 0 ? 'Selecciona un nivel para confirmar' : `Guardar con "${LEVELS.find(l => l.stars === selected)?.label}"`}
          </Button>
          {selected === 0 && (
            <button
              type='button'
              onClick={() => onConfirm(0)}
              className='w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50'
              style={{ borderColor: COLORS.border, color: COLORS.text }}
            >
              Continuar sin calificar
            </button>
          )}
          <button
            type='button'
            onClick={onCancel}
            className='w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50'
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
