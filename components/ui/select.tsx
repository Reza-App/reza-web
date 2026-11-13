'use client';

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: React.ReactNode;
  text: string;
  disabled: boolean;
}

type OptionElement = React.ReactElement<{ value?: string | number; children?: React.ReactNode; disabled?: boolean }>;

/** Reads the <option> children so the component is written like a <select>. */
function readOptions(children: React.ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as OptionElement;
    const label = el.props.children;
    const text = Children.toArray(label).join('');
    options.push({ value: String(el.props.value ?? text), label, text, disabled: !!el.props.disabled });
  });
  return options;
}

/**
 * Styled replacement for the native <select> (whose open list is drawn by
 * the operating system and can not be themed). Keyboard: arrows, Home/End,
 * Enter/Space to pick, Escape to close, letters to jump.
 */
export function Select({
  value,
  onValueChange,
  children,
  disabled,
  placeholder = 'Choisir',
  size = 'md',
  className,
  ...aria
}: {
  value: string | number | null | undefined;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
  id?: string;
}) {
  const options = useMemo(() => readOptions(children), [children]);
  const current = value === null || value === undefined ? '' : String(value);
  const selectedIndex = options.findIndex((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [above, setAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const openList = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    setAbove(!!rect && window.innerHeight - rect.bottom < 280 && rect.top > 280);
    setActive(selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled));
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== current) onValueChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    listRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (from: number, step: number) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onListKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => move(a, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => move(a, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(move(-1, 1));
        break;
      case 'End':
        e.preventDefault();
        setActive(move(0, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        if (e.key.length === 1) {
          const letter = e.key.toLowerCase();
          const start = active < 0 ? 0 : active + 1;
          const ordered = [...options.slice(start), ...options.slice(0, start)];
          const hit = ordered.find((o) => !o.disabled && o.text.toLowerCase().startsWith(letter));
          if (hit) setActive(options.indexOf(hit));
        }
    }
  };

  const sizing = size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-sm';

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        id={aria.id}
        disabled={disabled}
        aria-label={aria['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            openList();
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white text-left text-neutral-950 transition duration-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${sizing} ${
          open ? 'border-neutral-400 ring-4 ring-neutral-950/5' : 'border-neutral-200 hover:border-neutral-300 focus-visible:border-neutral-400 focus-visible:ring-4 focus-visible:ring-neutral-950/5'
        }`}
      >
        <span className={`truncate ${selectedIndex < 0 ? 'text-neutral-400' : ''}`}>
          {selectedIndex >= 0 ? options[selectedIndex].label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onKeyDown={onListKey}
          className={`animate-fadeIn absolute left-0 right-0 z-50 max-h-64 min-w-40 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-950/5 focus:outline-none ${
            above ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {options.map((option, i) => {
            const selected = option.value === current;
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                  option.disabled
                    ? 'cursor-not-allowed text-neutral-300'
                    : i === active
                      ? 'bg-neutral-100 text-neutral-950'
                      : 'text-neutral-700'
                } ${selected ? 'font-medium text-neutral-950' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check size={15} className="shrink-0 text-neutral-950" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
