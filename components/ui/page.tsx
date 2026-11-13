'use client';

import { useId } from 'react';
import { ChevronLeft, ChevronRight, Info, Search } from 'lucide-react';
import { clampPage, pageRange } from '@/lib/pagination';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-medium text-neutral-950">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </header>
    </>
  );
}

/** Title of a list with its count, filters on the right. */
export function ListHeader({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-medium text-neutral-950">
        {title}
        {count !== undefined && (
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">{count}</span>
        )}
      </h2>
      {children && <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">{children}</div>}
    </div>
  );
}

/**
 * ⓘ with a styled tooltip, shown on hover and on keyboard focus (the native
 * title tooltip is slow and unstyled). The text is also exposed to screen
 * readers through aria-describedby.
 */
export function InfoTip({ text }: { text: string }) {
  const id = useId();
  return (
    <span className="group/tip relative shrink-0">
      <button
        type="button"
        aria-label="Information"
        aria-describedby={id}
        className="flex rounded-full text-neutral-300 transition-colors duration-150 hover:text-neutral-600 focus-visible:text-neutral-600"
      >
        <Info size={16} />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-60 translate-y-1 rounded-xl bg-neutral-950 px-3.5 py-2.5 text-xs font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-xl transition duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export type StatTone = 'default' | 'green' | 'amber' | 'red' | 'violet' | 'sky';

const VALUE_TONE: Record<StatTone, string> = {
  default: 'text-neutral-950',
  green: 'text-emerald-700',
  amber: 'text-amber-600',
  red: 'text-red-600',
  violet: 'text-violet-700',
  sky: 'text-sky-700',
};

const BADGE_TONE: Record<Exclude<StatTone, 'default'>, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
  sky: 'bg-sky-50 text-sky-700',
};

/**
 * One figure of a stat group: label with an optional coloured badge, an info
 * tooltip, the value (coloured by meaning: money in green, to follow in
 * amber...) and a hint line. Place several inside a `stat-grid` container.
 */
export function StatCard({
  label,
  value,
  hint,
  badge,
  tone = 'default',
  info,
  onSelect,
  selected = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  badge?: { label: string; tone: Exclude<StatTone, 'default'> };
  tone?: StatTone;
  info?: string;
  /** Makes the whole card a toggle (the info button stays a separate control). */
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <div
      className={`relative h-full p-5 transition-colors duration-200 ${
        selected ? 'bg-neutral-50' : 'bg-white hover:bg-neutral-50/60'
      }`}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={label}
          className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-offset-[-2px]"
        />
      )}
      {selected && <span className="absolute inset-x-0 top-0 h-0.5 bg-neutral-950" aria-hidden />}
      <div className="pointer-events-none relative z-10 flex min-h-6 items-start justify-between gap-3">
        <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-neutral-500">{label}</p>
          {badge && (
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_TONE[badge.tone]}`}>{badge.label}</span>
          )}
        </div>
        {info && (
          <span className="pointer-events-auto">
            <InfoTip text={info} />
          </span>
        )}
      </div>
      <p className={`pointer-events-none relative mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.7rem] ${VALUE_TONE[tone]}`}>{value}</p>
      {hint && <p className="pointer-events-none relative mt-1.5 text-xs leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow duration-200 hover:shadow-sm ${className ?? ''}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-medium text-neutral-950">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm transition focus:bg-white placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none"
      />
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-full bg-neutral-100 p-1" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            value === o.value ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-950'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const pageButton =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm tabular-nums transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35';

/**
 * Page navigation under a list. With `total` and `pageSize` it also tells
 * which rows are shown (« 11 à 20 sur 45 »). Hidden when everything fits on
 * one page.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  total,
  pageSize,
  label = 'éléments',
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  /** Plural noun used in the summary, e.g. « clients ». */
  label?: string;
}) {
  if (totalPages <= 1) return null;
  const go = (p: number) => {
    onChange(clampPage(p, totalPages));
  };
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = from !== null && total !== undefined && pageSize ? Math.min(total, page * pageSize) : null;

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <p className="tabular-nums text-neutral-500" aria-live="polite">
        {from !== null && to !== null ? (
          <>
            <span className="text-neutral-900">
              {from} à {to}
            </span>{' '}
            sur {total} {label}
          </>
        ) : (
          <>
            Page <span className="text-neutral-900">{page}</span> sur {totalPages}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} className={`${pageButton} text-neutral-700 hover:bg-neutral-100`} aria-label="Page précédente">
          <ChevronLeft size={16} />
        </button>
        {pageRange(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="w-6 text-center text-neutral-400" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={`${pageButton} ${p === page ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)} className={`${pageButton} text-neutral-700 hover:bg-neutral-100`} aria-label="Page suivante">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export function Table({ head, children, fixed = false }: { head: React.ReactNode[]; children: React.ReactNode; /** Same column widths across several tables. */ fixed?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className={`w-full text-left text-sm ${fixed ? "table-fixed" : ""}`}>
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}

export type BadgeTone = 'neutral' | 'solid' | 'muted' | 'danger' | Exclude<StatTone, 'default'>;

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const styles = {
    neutral: 'border border-neutral-300 text-neutral-800',
    solid: 'bg-neutral-950 text-white',
    muted: 'bg-neutral-100 text-neutral-500',
    danger: 'border border-red-200 bg-red-50 text-red-700',
    ...BADGE_TONE,
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initials || '?'}
    </span>
  );
}
