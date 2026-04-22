import { useRef } from 'react';
import { AppIcons } from '@/components/icons/appIcons';

const MAX_PHOTOS = 5;
const ACCEPTED = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

export interface MediaUploadState {
  photos: File[];
  photoPreviews: string[];
  video: File | null;
  /** URLs ya guardadas en el servidor (modo edición) */
  existingPhotoUrls: string[];
  existingVideoUrl: string | null;
}

export function createEmptyMediaState(): MediaUploadState {
  return {
    photos: [],
    photoPreviews: [],
    video: null,
    existingPhotoUrls: [],
    existingVideoUrl: null,
  };
}

interface MediaUploadProps {
  state: MediaUploadState;
  onChange: (next: MediaUploadState) => void;
  /** En reseña existente: textos orientados a “editar” en lugar de “agregar”. */
  variant?: 'create' | 'edit';
}

export function MediaUpload({
  state,
  onChange,
  variant = 'create',
}: MediaUploadProps) {
  const {
    photos,
    photoPreviews,
    video,
    existingPhotoUrls,
    existingVideoUrl,
  } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPhotos = existingPhotoUrls.length + photos.length;
  const hasVideoSlot = !video && !existingVideoUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPhotos: File[] = [];
    let newVideo = video;
    let replacedVideoWithFile = false;

    for (const file of files) {
      if (file.type.startsWith('video/')) {
        newVideo = file;
        replacedVideoWithFile = true;
      } else if (file.type.startsWith('image/')) {
        newPhotos.push(file);
      }
    }

    const room = Math.max(0, MAX_PHOTOS - existingPhotoUrls.length);
    const merged = [...photos, ...newPhotos].slice(0, room);
    onChange({
      photos: merged,
      photoPreviews: merged.map((f) => URL.createObjectURL(f)),
      video: newVideo,
      existingPhotoUrls,
      existingVideoUrl: replacedVideoWithFile ? null : existingVideoUrl,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChange({
      photos: next,
      photoPreviews: next.map((f) => URL.createObjectURL(f)),
      video,
      existingPhotoUrls,
      existingVideoUrl,
    });
  };

  const removeExistingPhoto = (idx: number) => {
    onChange({
      photos,
      photoPreviews,
      video,
      existingPhotoUrls: existingPhotoUrls.filter((_, i) => i !== idx),
      existingVideoUrl,
    });
  };

  const showPreviewRow =
    existingPhotoUrls.length > 0 ||
    photoPreviews.length > 0 ||
    video !== null ||
    existingVideoUrl !== null;

  return (
    <div className='space-y-3'>
      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPTED}
        multiple
        className='hidden'
        onChange={handleFileChange}
      />

      {showPreviewRow && (
        <div className='flex flex-wrap gap-2'>
          {existingPhotoUrls.map((src, idx) => (
            <div key={`e-${src}-${idx}`} className='relative'>
              <img
                src={src}
                alt={`Foto guardada ${idx + 1}`}
                className='h-20 w-20 rounded-lg border-2 border-neutral-300 object-cover shadow-sm'
              />
              <button
                type='button'
                onClick={() => removeExistingPhoto(idx)}
                className='absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white'
                aria-label='Quitar foto guardada'
              >
                ✕
              </button>
            </div>
          ))}
          {photoPreviews.map((src, idx) => (
            <div key={`n-${src}-${idx}`} className='relative'>
              <img
                src={src}
                alt={`Foto nueva ${idx + 1}`}
                className='h-20 w-20 rounded-lg border-2 border-neutral-300 object-cover shadow-sm'
              />
              <button
                type='button'
                onClick={() => removePhoto(idx)}
                className='absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white'
                aria-label='Eliminar foto'
              >
                ✕
              </button>
            </div>
          ))}
          {video && (
            <div className='relative flex h-20 w-20 items-center justify-center rounded-lg border-2 border-neutral-300 bg-neutral-100 text-2xl shadow-sm'>
              <AppIcons.Film className='h-7 w-7 text-neutral-700' aria-hidden />
              <span className='absolute bottom-0.5 left-0 right-0 truncate px-0.5 text-[9px] text-neutral-500'>
                Nuevo
              </span>
              <button
                type='button'
                onClick={() =>
                  onChange({
                    photos,
                    photoPreviews,
                    video: null,
                    existingPhotoUrls,
                    existingVideoUrl,
                  })
                }
                className='absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white'
                aria-label='Eliminar video'
              >
                ✕
              </button>
            </div>
          )}
          {!video && existingVideoUrl && (
            <div className='relative flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-neutral-300 bg-neutral-100 text-2xl shadow-sm'>
              <AppIcons.Film className='h-7 w-7 text-neutral-700' aria-hidden />
              <span className='absolute bottom-0.5 left-0 right-0 truncate px-0.5 text-[9px] text-neutral-500'>
                Guardado
              </span>
              <button
                type='button'
                onClick={() =>
                  onChange({
                    photos,
                    photoPreviews,
                    video: null,
                    existingPhotoUrls,
                    existingVideoUrl: null,
                  })
                }
                className='absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white'
                aria-label='Quitar video guardado'
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type='button'
        onClick={() => fileInputRef.current?.click()}
        disabled={totalPhotos >= MAX_PHOTOS}
        className='flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-400 bg-neutral-50/50 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-primary hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
      >
        <AppIcons.Camera className='h-4 w-4' aria-hidden />{' '}
        {totalPhotos >= MAX_PHOTOS
          ? `Máximo ${MAX_PHOTOS} fotos`
          : variant === 'edit'
            ? `Editar fotos${hasVideoSlot ? ' / video' : ''}`
            : `Agregar fotos${hasVideoSlot ? ' / video' : ''}`}
        {totalPhotos > 0 && ` (${totalPhotos}/${MAX_PHOTOS})`}
      </button>
      <p className='text-[11px] text-neutral-400'>
        {variant === 'edit' ? (
          <>
            Hasta {MAX_PHOTOS} fotos (jpg, png, webp) y 1 video (mp4, mov). Las
            miniaturas “Guardado” están en tu reseña; puedes quitarlas o añadir
            más.
          </>
        ) : (
          <>
            Hasta {MAX_PHOTOS} fotos (jpg, png, webp) y 1 video (mp4, mov).
          </>
        )}
      </p>
    </div>
  );
}
