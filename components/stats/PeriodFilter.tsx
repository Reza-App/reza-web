'use client';

import { useUrlState } from '@/hooks/useUrlState';
import { SegmentedControl } from '@/components/ui/page';
import type { PeriodQuery } from '@/lib/api/services/stats.service';

export type Period = 'week' | 'month' | 'year' | 'all' | 'custom';

const LABELS: Record<Period, string> = {
  week: '7 jours',
  month: 'Ce mois',
  year: 'Cette année',
  all: 'Tout',
  custom: 'Dates',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Period selected in the URL, as the query the stats endpoints expect. */
export function usePeriod(defaultPeriod: Exclude<Period, 'custom'> = 'month') {
  const { get, set } = useUrlState();
  const raw = get('period', defaultPeriod) as Period;
  const period: Period = raw in LABELS ? raw : defaultPeriod;
  const from = get('from');
  const to = get('to');

  const query: PeriodQuery =
    period === 'custom' && DATE_RE.test(from) && DATE_RE.test(to) && from <= to
      ? { startDate: from, endDate: `${to}T23:59:59` }
      : { period: period === 'custom' ? defaultPeriod : period };

  return {
    period,
    from,
    to,
    query,
    key: JSON.stringify(query),
    setPeriod: (p: Period) => set({ period: p === defaultPeriod ? null : p, ...(p === 'custom' ? {} : { from: null, to: null }) }),
    setRange: (f: string, t: string) => set({ from: f || null, to: t || null }),
  };
}

export function PeriodFilter({ defaultPeriod = 'month' }: { defaultPeriod?: Exclude<Period, 'custom'> }) {
  const { period, from, to, setPeriod, setRange } = usePeriod(defaultPeriod);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {period === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            aria-label="Du"
            value={from}
            max={to || undefined}
            onChange={(e) => setRange(e.target.value, to)}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none"
          />
          <span className="text-neutral-400">au</span>
          <input
            type="date"
            aria-label="Au"
            value={to}
            min={from || undefined}
            onChange={(e) => setRange(from, e.target.value)}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none"
          />
        </div>
      )}
      <SegmentedControl<Period>
        label="Période"
        value={period}
        onChange={setPeriod}
        options={(Object.keys(LABELS) as Period[]).map((p) => ({ value: p, label: LABELS[p] }))}
      />
    </div>
  );
}
