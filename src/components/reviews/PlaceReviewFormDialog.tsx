import React, { useEffect, useState } from 'react';
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
import { usePlaces } from '@/context/usePlaces';
import { PlaceReviewForm } from './PlaceReviewForm';

type PlaceReviewFormDialogProps = {
  placeId: number;
  onSaved?: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive';
  triggerStyle?: React.CSSProperties;
  onLoginOpenChange?: (open: boolean) => void;
};

export function PlaceReviewFormDialog({
  placeId,
  onSaved,
  triggerClassName,
  triggerLabel,
  triggerVariant,
  triggerStyle,
  onLoginOpenChange,
}: PlaceReviewFormDialogProps) {
  const { isAuthenticated, user } = useAuth();
  const { myReviewWithAccessibility } = usePlaces();
  const [open, setOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) { setHasReview(false); return; }
    myReviewWithAccessibility(placeId).then((r) => setHasReview(!!r));
  }, [isAuthenticated, user, placeId, myReviewWithAccessibility]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!isAuthenticated) onLoginOpenChange?.(next);
  }

  const handleSaved = () => {
    onSaved?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type='button'
          className={cn('gap-1.5 font-semibold', triggerClassName)}
          variant={triggerVariant ?? (isAuthenticated ? 'default' : 'outline')}
          style={triggerStyle ?? (isAuthenticated ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: '#fff' } : undefined)}
        >
          <MessageSquarePlus className='h-4 w-4' aria-hidden />
          {triggerLabel ??
            (!isAuthenticated ? 'Dejar una reseña' : hasReview ? 'Editar mi reseña' : 'Dejar una reseña')}
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
