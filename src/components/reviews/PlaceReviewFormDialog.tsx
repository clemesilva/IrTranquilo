import React, { useState } from 'react';
import { COLORS } from '@/styles/colors';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/useAuth';
import { PlaceReviewForm } from './PlaceReviewForm';

type PlaceReviewFormDialogProps = {
  placeId: number;
  onSaved?: () => void;
  /** Clases extra para el botón que abre el diálogo (p. ej. ancho responsive). */
  triggerClassName?: string;
  /** Texto personalizado para el botón trigger (si se omite, usa el default). */
  triggerLabel?: string;
  /** Permite forzar el variant del botón trigger. */
  triggerVariant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive';
  triggerStyle?: React.CSSProperties;
};

export function PlaceReviewFormDialog({
  placeId,
  onSaved,
  triggerClassName,
  triggerLabel,
  triggerVariant,
  triggerStyle,
}: PlaceReviewFormDialogProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSaved = () => {
    onSaved?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type='button'
          className={cn('gap-1.5 font-semibold', triggerClassName)}
          variant={triggerVariant ?? (isAuthenticated ? 'default' : 'outline')}
          style={triggerStyle ?? (isAuthenticated ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: '#fff' } : undefined)}
        >
          <MessageSquarePlus className='h-4 w-4' aria-hidden />
          {triggerLabel ??
            (isAuthenticated ? 'Editar mi reseña' : 'Dejar una reseña')}
        </Button>
      </DialogTrigger>
      <DialogContent className='flex max-h-[min(92dvh,680px)] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0'>
        <DialogHeader className='shrink-0 border-b border-neutral-100 px-5 pb-3 pt-4 text-left sm:pr-12'>
          <DialogTitle>Tu reseña</DialogTitle>
        </DialogHeader>
        {open ? (
          <PlaceReviewForm
            placeId={placeId}
            className='flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-transparent p-0 shadow-none'
            onSaved={handleSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
