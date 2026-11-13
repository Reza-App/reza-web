'use client';

import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, StatCard } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { statsService } from '@/lib/api/services/stats.service';
import { formatPercent } from '@/lib/format';

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

/** Sequential single hue scale: white to ink, text flips to white on dark cells. */
function cellStyle(rate: number) {
  const t = Math.max(0, Math.min(100, rate)) / 100;
  const light = Math.round(98 - t * 88);
  return { background: `hsl(0 0% ${light}%)`, color: light < 55 ? '#fff' : '#0a0a0a' };
}

export default function OccupancyOverviewPage() {
  const period = usePeriod('month');
  const query = useApiQuery(`occupancy:${period.key}`, (signal) => statsService.occupancyOverview(period.query, signal));
  const d = query.data;
  const slots = d ? Object.keys(d.occupancyData[DAYS[0]] ?? {}) : [];

  return (
    <div>
      <PageHeader title="Taux d'occupation" description="Part du temps d'ouverture réservée, par jour et par heure." actions={<PeriodFilter />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-1 sm:grid-cols-2">
              <StatCard info="Part du temps de travail réservée par des rendez vous." label="Occupation moyenne" value={formatPercent(d.stats.average, 1)} />
              <StatCard info="Créneau horaire le plus chargé de la semaine." label="Pic d'occupation" value={formatPercent(d.stats.peak)} hint={`${d.stats.peakDay} ${d.stats.peakTime}`} />
            </div>
            <Card title="Occupation par créneau">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr>
                      <th />
                      {DAYS.map((day) => (
                        <th key={day} className="pb-2 font-semibold tracking-[0.1em] text-neutral-500">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot}>
                        <th className="whitespace-nowrap pr-3 text-right font-normal tabular-nums text-neutral-500">{slot}</th>
                        {DAYS.map((day) => {
                          const rate = d.occupancyData[day]?.[slot] ?? 0;
                          return (
                            <td
                              key={day}
                              title={`${day} ${slot} : ${formatPercent(rate)}`}
                              className="h-9 min-w-16 rounded-md text-center tabular-nums"
                              style={cellStyle(rate)}
                            >
                              {rate > 0 ? `${Math.round(rate)} %` : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500">
                0 %
                <span className="h-2 w-40 rounded-full" style={{ background: 'linear-gradient(to right, hsl(0 0% 98%), hsl(0 0% 10%))' }} aria-hidden />
                100 %
              </div>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
