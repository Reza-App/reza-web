'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Horizontal row without a scrollbar: swipe, wheel or trackpad, plus two
 * arrows (from the tablet width up) shown only when there is more to see,
 * and a soft fade on the edge that hides content.
 */
export function ScrollRow({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, children]);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={ref}
        onScroll={measure}
        role="group"
        aria-label={label}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth"
        style={{
          maskImage: `linear-gradient(to right, ${edges.start ? 'transparent, black 48px' : 'black, black'}, ${edges.end ? 'black calc(100% - 48px), transparent' : 'black, black'})`,
        }}
      >
        {children}
      </div>
      {edges.start && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-2 text-neutral-800 shadow-sm transition hover:bg-neutral-950 hover:text-white sm:block"
          aria-label="Défiler vers la gauche"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {edges.end && (
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-2 text-neutral-800 shadow-sm transition hover:bg-neutral-950 hover:text-white sm:block"
          aria-label="Défiler vers la droite"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
