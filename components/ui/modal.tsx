'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { usePagePanel } from '@/components/layout/PagePanelHost';

/**
 * Form container. In the dashboard a create or edit form opens as a page of
 * its own: the list is hidden, a « Retour » button leads back to it (Escape
 * too). Outside the dashboard it falls back to a dialog.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  busy = false,
  backLabel = 'Retour',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
  /** Text of the back button when the form is shown as a page. */
  backLabel?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { slot, acquire } = usePagePanel();

  // As a page: hide the list underneath while the form is open.
  useEffect(() => {
    if (!open || !slot) return;
    return acquire();
  }, [open, slot, acquire]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    if (slot) window.scrollTo({ top: 0 });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose, slot]);

  if (!open) return null;

  if (slot) {
    return createPortal(
      <section ref={panelRef} tabIndex={-1} aria-labelledby="modal-title" className="animate-fadeUp w-full outline-none">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={backLabel}
            title={backLabel}
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition duration-200 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <ArrowLeft size={18} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
          <h1 id="modal-title" className="text-2xl font-medium text-neutral-950 sm:text-3xl">
            {title}
          </h1>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white">
          <div className="px-5 py-6 sm:px-8 sm:py-7">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 px-5 py-4 sm:px-8 sm:py-5">{footer}</div>}
        </div>
      </section>,
      slot,
    );
  }

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl';

  return (
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
        {footer && <div className="flex justify-end gap-2 border-t border-neutral-100 px-7 py-4">{footer}</div>}
      </div>
    </div>
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-neutral-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition duration-200 hover:bg-neutral-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
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
