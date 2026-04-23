import { useState, useRef } from 'react';

interface ReviewMediaProps {
  photoUrls?: string[];
  videoUrl?: string | null;
}

type MediaItem =
  | { type: 'photo'; url: string }
  | { type: 'video'; url: string };

export function ReviewMedia({ photoUrls = [], videoUrl }: ReviewMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);

  // Video siempre primero
  const items: MediaItem[] = [
    ...(videoUrl ? [{ type: 'video' as const, url: videoUrl }] : []),
    ...photoUrls.map(url => ({ type: 'photo' as const, url })),
  ];

  if (items.length === 0) return null;

  const MAX_PREVIEW = 3;
  const visibleItems = items.slice(0, MAX_PREVIEW);
  const extraCount = items.length - MAX_PREVIEW;

  const prev = () => setLightboxIndex(i => (i != null ? (i - 1 + items.length) % items.length : 0));
  const next = () => setLightboxIndex(i => (i != null ? (i + 1) % items.length : 0));

  return (
    <>
      {/* Preview strip */}
      <div className='mt-2 flex gap-1.5'>
        {visibleItems.map((item, i) => {
          const isLast = i === MAX_PREVIEW - 1 && extraCount > 0;
          return (
            <button
              key={i}
              type='button'
              onClick={() => setLightboxIndex(i)}
              className={`relative h-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 hover:opacity-90 transition ${item.type === 'video' ? 'w-28' : 'w-16'}`}
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className='h-full w-full object-cover pointer-events-none'
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img src={item.url} alt={`Foto ${i + 1}`} className='h-full w-full object-cover' />
              )}
              {isLast && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/55 text-white text-sm font-bold rounded-xl'>
                  +{extraCount + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95'
          onClick={() => setLightboxIndex(null)}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (diff > 50) next();
            else if (diff < -50) prev();
          }}
        >
          {/* Cerrar */}
          <button
            type='button'
            onClick={() => setLightboxIndex(null)}
            className='absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white text-lg hover:bg-white/30'
          >
            ✕
          </button>

          {/* Contador */}
          <div className='absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white'>
            {lightboxIndex + 1} / {items.length}
          </div>

          {/* Contenido principal */}
          <div
            className='flex max-h-[75dvh] max-w-[92vw] items-center justify-center'
            onClick={e => e.stopPropagation()}
          >
            {items[lightboxIndex].type === 'video' ? (
              <video
                src={items[lightboxIndex].url}
                controls
                autoPlay
                className='max-h-[75dvh] max-w-[92vw] rounded-xl'
              />
            ) : (
              <img
                src={items[lightboxIndex].url}
                alt={`Foto ${lightboxIndex + 1}`}
                className='max-h-[75dvh] max-w-[92vw] rounded-xl object-contain'
              />
            )}
          </div>

          {/* Prev / Next */}
          {items.length > 1 && (
            <>
              <button
                type='button'
                onClick={e => { e.stopPropagation(); prev(); }}
                className='absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-2xl hover:bg-white/30'
              >
                ‹
              </button>
              <button
                type='button'
                onClick={e => { e.stopPropagation(); next(); }}
                className='absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-2xl hover:bg-white/30'
              >
                ›
              </button>
            </>
          )}

          {/* Thumbnails */}
          <div
            className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto px-4'
            onClick={e => e.stopPropagation()}
          >
            {items.map((item, i) => (
              <button
                key={i}
                type='button'
                onClick={() => setLightboxIndex(i)}
                className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition ${lightboxIndex === i ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
              >
                {item.type === 'video' ? (
                  <>
                    <video src={item.url} className='h-full w-full object-cover pointer-events-none' muted />
                    <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
                      <span className='text-white text-[10px]'>▶</span>
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt='' className='h-full w-full object-cover' />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
