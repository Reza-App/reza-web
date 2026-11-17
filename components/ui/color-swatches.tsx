'use client';

import { Check } from 'lucide-react';

/** Agenda colours: distinct from each other and readable on a light tint. */
export const AGENDA_COLORS = [
  { value: '#0a0a0a', name: 'Noir' },
  { value: '#6b7280', name: 'Gris' },
  { value: '#8b7260', name: 'Taupe' },
  { value: '#ca8a04', name: 'Moutarde' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#dc2626', name: 'Rouge' },
  { value: '#db2777', name: 'Rose' },
  { value: '#9333ea', name: 'Violet' },
  { value: '#4f46e5', name: 'Indigo' },
  { value: '#2563eb', name: 'Bleu' },
  { value: '#0d9488', name: 'Turquoise' },
  { value: '#16a34a', name: 'Vert' },
];

/** Pick a colour among the palette (a colour set elsewhere stays shown). */
export function ColorSwatches({ value, onChange, label }: { value: string | null | undefined; onChange: (color: string) => void; label: string }) {
  const current = value?.toLowerCase() ?? '';
  const known = AGENDA_COLORS.some((c) => c.value === current);
  const colors = known || !/^#[0-9a-f]{6}$/.test(current) ? AGENDA_COLORS : [...AGENDA_COLORS, { value: current, name: 'Couleur actuelle' }];
  return (
    <div className="flex flex-wrap gap-2 py-1" role="radiogroup" aria-label={label}>
      {colors.map((c) => {
        const on = c.value === current;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 ${on ? 'ring-2 ring-neutral-950 ring-offset-2' : ''}`}
            style={{ backgroundColor: c.value }}
          >
            {on && <Check size={15} className="text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
