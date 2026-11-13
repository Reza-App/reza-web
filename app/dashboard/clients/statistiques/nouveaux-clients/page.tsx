'use client';

import { BarChartView } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';
import { formatDate, personName } from '@/lib/format';

const EMPTY: never[] = [];

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

export default function NewClientsPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`new-clients:${period.key}`, (signal) => statsService.newClients(period.query, signal));
  const data = query.data;
  const pager = usePagination(data?.clients ?? EMPTY, 10, period.key);
  const booked = data?.clients.filter((c) => c.appointmentCount > 0).length ?? 0;

  return (
    <div>
      <PageHeader title="Nouveaux clients" description="Clients venus pour la première fois sur la période." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !data} error={query.error} onRetry={query.refetch}>
        {!data || data.total === 0 ? (
          <EmptyState title="Aucun nouveau client sur cette période" />
        ) : (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-1 sm:grid-cols-3">
              <StatCard info="Clients venus pour la première fois sur la période." label="Nouveaux clients" value={data.total} />
              <StatCard info="Nouveaux clients ayant déjà au moins un rendez vous." label="Ont déjà réservé" value={booked} />
              <StatCard info="Nouveaux clients par mois, en moyenne sur la période." label="Moyenne mensuelle" value={Math.round(data.total / Math.max(1, data.trend.length))} />
            </div>
            {data.trend.length > 1 && (
              <Card title="Nouveaux clients par mois">
                <BarChartView data={data.trend.map((t) => ({ mois: monthLabel(t.month), clients: t.count }))} x="mois" series={[{ key: 'clients', label: 'Nouveaux clients' }]} />
              </Card>
            )}
            <Table head={['Client', 'Contact', 'Arrivé le', 'RDV', 'Factures']}>
              {pager.pageItems.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-neutral-950">{personName(c)}</td>
                  <td className="px-5 py-3 text-neutral-600">{c.phone ?? c.email}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3 tabular-nums">{c.appointmentCount}</td>
                  <td className="px-5 py-3 tabular-nums">{c.invoiceCount}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="clients" onChange={pager.setPage} />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
