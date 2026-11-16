'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Full screen photo viewer: arrows (buttons or keyboard), Escape or a click
 * outside the photo to close. Focus goes to the viewer and back on close.
 */
export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  title,
}: {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const count = photos.length;
  const go = (delta: number) => onIndexChange((index + delta + count) % count);

  const handlers = useRef({ go, onClose });
  useEffect(() => {
    handlers.current = { go, onClose };
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlers.current.onClose();
      if (e.key === 'ArrowRight') handlers.current.go(1);
      if (e.key === 'ArrowLeft') handlers.current.go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const src = photos[index];
  if (!src) return null;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos de ${title}`}
      className="animate-fadeIn fixed inset-0 z-[90] flex flex-col bg-black/95 outline-none"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-4 text-white sm:px-8" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-white/70">
          {title} · {index + 1} / {count}
        </p>
        <button type="button" onClick={onClose} className="rounded-full p-2.5 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Fermer">
          <X size={22} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-20">
        <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
          <Image key={src} src={src} alt={`Photo ${index + 1} de ${title}`} fill unoptimized sizes="100vw" className="animate-fadeIn object-contain" />
        </div>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6"
              aria-label="Photo précédente"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6"
              aria-label="Photo suivante"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-4 pb-5" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition ${i === index ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'}`}
            >
              <Image src={p} alt="" fill unoptimized sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
