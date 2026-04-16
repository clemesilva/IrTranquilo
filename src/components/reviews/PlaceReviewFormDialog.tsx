import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
};

export function PlaceReviewFormDialog({
  placeId,
  onSaved,
  triggerClassName,
  triggerLabel,
  triggerVariant,
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
          className={cn('h-10 gap-2 text-sm font-semibold', triggerClassName)}
          variant={triggerVariant ?? (isAuthenticated ? 'default' : 'outline')}
        >
          <MessageSquarePlus className='h-4 w-4' aria-hidden />
          {triggerLabel ??
            (isAuthenticated ? 'Editar mi reseña' : 'Dejar una reseña')}
        </Button>
      </DialogTrigger>
      <DialogContent className='w-[calc(100vw-2rem)] max-w-lg rounded-2xl sm:w-full sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Tu reseña</DialogTitle>
          <DialogDescription>
            Calificación, accesibilidad y comentario opcional. Se guarda al
            publicar.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PlaceReviewForm
            placeId={placeId}
            className='border-0 p-0 shadow-none'
            onSaved={handleSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
