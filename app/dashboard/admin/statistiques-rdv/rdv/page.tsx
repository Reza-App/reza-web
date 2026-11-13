'use client';

import { BarChartView } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';

export default function DailyAppointmentsPage() {
  const period = usePeriod('month');
  const query = useApiQuery(`stats-daily:${period.key}`, (signal) => statsService.daily(period.query, signal));
  const d = query.data;
  const activeDays = d?.dailyData.filter((r) => r.totalPrestations || r.annules || r.absents) ?? [];
  const pager = usePagination(activeDays, 10, period.key);

  return (
    <div>
      <PageHeader title="Rendez vous jour par jour" description="Prestations, absences et annulations quotidiennes." actions={<PeriodFilter />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Nombre de prestations réalisées sur la période." label="Prestations" value={d.totals.totalPrestations} hint={`${d.totals.inSalon} au salon, ${d.totals.online} en ligne`} />
              <StatCard info="Part des rendez vous réservés en ligne par les clients." label="Part en ligne" value={d.totals.totalOnlineRate} />
              <StatCard info="Rendez vous où le client ne s’est pas présenté, sur la période." label="Absences" value={d.totals.absents} hint={d.totals.totalTauxAbsence} />
              <StatCard info="Rendez vous annulés sur la période, selon la date d’annulation." label="Annulations" value={d.totals.annules} hint={d.totals.totalTauxAnnulation} />
            </div>
            <Card title="Prestations par jour">
              <BarChartView
                data={d.dailyData}
                x="date"
                series={[
                  { key: 'inSalon', label: 'Au salon' },
                  { key: 'online', label: 'En ligne' },
                ]}
              />
            </Card>
            <Table head={['Jour', 'Prestations', 'Au salon', 'En ligne', 'Part en ligne', 'Absents', 'Annulés']}>
              {pager.pageItems.map((r) => (
                <tr key={r.date}>
                  <td className="px-5 py-3 font-medium text-neutral-950">{r.date}</td>
                  <td className="px-5 py-3 tabular-nums">{r.totalPrestations}</td>
                  <td className="px-5 py-3 tabular-nums">{r.inSalon}</td>
                  <td className="px-5 py-3 tabular-nums">{r.online}</td>
                  <td className="px-5 py-3 tabular-nums">{r.onlineRate}</td>
                  <td className="px-5 py-3 tabular-nums">{r.absents}</td>
                  <td className="px-5 py-3 tabular-nums">{r.annules}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="jours" onChange={pager.setPage} />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
