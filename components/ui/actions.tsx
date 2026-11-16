'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';

/**
 * Coloured action styles. The brand stays black and white for primary
 * actions; secondary actions get a soft tint so they are told apart at a
 * glance (export, print, settings...). Colour is never the only cue: every
 * button keeps an icon and a label (or an aria-label).
 */
export type Tone = 'green' | 'violet' | 'sky' | 'amber' | 'red' | 'neutral';

/** Black and white for every secondary action; red only for destructive ones. */
const NEUTRAL_BUTTON = 'border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white';
const TONE_BUTTON: Record<Tone, string> = {
  green: NEUTRAL_BUTTON,
  violet: NEUTRAL_BUTTON,
  sky: NEUTRAL_BUTTON,
  amber: NEUTRAL_BUTTON,
  neutral: NEUTRAL_BUTTON,
  red: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white',
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
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${TONE_BUTTON[tone]} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

const ICON_ACTIONS = {
  view: { icon: Eye, tone: 'border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white' },
  edit: { icon: Pencil, tone: 'border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white' },
  delete: { icon: Trash2, tone: 'border border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' },
} as const;

/** Small round row action: view and edit in black and white, delete in red. */
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
      className={`flex h-9 w-9 items-center justify-center rounded-full transition duration-200 active:scale-95 ${tone}`}
    >
      <Icon size={16} />
    </button>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-1.5">{children}</div>;
}
