'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

/**
 * Create and edit forms: a dialog over the page. Escape, the cross or a click
 * outside closes it (not while saving). Focus moves into the dialog once,
 * when it opens. A form error shows at the bottom, right above the buttons,
 * so it is seen without scrolling back up.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  busy = false,
  error,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
  /** Message of the last failed submit (validation or server). */
  error?: string | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Latest close handler and busy flag, read by the listener below without
  // re-running effects: callers often pass an inline onClose, and re-running
  // the focus effect on every render stole the focus from the field typed in.
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !busy && onClose()}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        className={`animate-fadeIn flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-7 py-5">
          <h2 id="modal-title" className="text-xl font-medium text-neutral-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-950"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {error && (
          <p role="alert" className="animate-fadeIn mx-7 mb-1 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {footer && <div className={`flex justify-end gap-2 px-7 py-4 ${error ? '' : 'border-t border-neutral-100'}`}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function PrimaryButton({
  children,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-neutral-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    >
      {busy ? 'Patientez...' : children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition duration-200 hover:bg-neutral-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none disabled:bg-neutral-50';

/** Compact time input (no full width), for schedules. */
export const timeFieldClass = fieldClass.replace('w-full', 'w-32');

export function FormField({
  label,
  error,
  hint,
  children,
  className,
  group = false,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  /** Several controls inside: render a labelled group instead of a <label>. */
  group?: boolean;
}) {
  const Wrapper = group ? 'div' : 'label';
  return (
    <Wrapper className={`block ${className ?? ''}`} role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </Wrapper>
  );
}
