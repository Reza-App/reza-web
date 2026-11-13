'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';

/**
 * Coloured action styles. The brand stays black and white for primary
 * actions; secondary actions get a soft tint so they are told apart at a
 * glance (export, print, settings...). Colour is never the only cue: every
 * button keeps an icon and a label (or an aria-label).
 */
export type Tone = 'green' | 'violet' | 'sky' | 'amber' | 'red' | 'neutral';

const TONE_BUTTON: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  sky: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
  amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  red: 'bg-red-50 text-red-700 hover:bg-red-100',
  neutral: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
};

/** Soft tinted header button (secondary action). */
export function ToneButton({
  tone,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${TONE_BUTTON[tone]} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

const ICON_ACTIONS = {
  view: { icon: Eye, tone: 'bg-sky-50 text-sky-600 hover:bg-sky-100' },
  edit: { icon: Pencil, tone: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  delete: { icon: Trash2, tone: 'bg-red-50 text-red-600 hover:bg-red-100' },
} as const;

/** Small square row action: view (blue), edit (amber), delete (red). */
export function IconAction({
  kind,
  label,
  onClick,
}: {
  kind: keyof typeof ICON_ACTIONS;
  label: string;
  onClick: () => void;
}) {
  const { icon: Icon, tone } = ICON_ACTIONS[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition duration-200 active:scale-95 ${tone}`}
    >
      <Icon size={16} />
    </button>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-1.5">{children}</div>;
}
