'use client';

import { BarChartView } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';
import { formatDate, formatMoney, personName } from '@/lib/format';

const LIMIT = 100;

export default function TopClientsPage() {
  const period = usePeriod('all');
  const query = useApiQuery(`top-clients:${period.key}`, (signal) => statsService.topClients({ ...period.query, limit: LIMIT }, signal));
  const clients = query.data?.clients ?? [];
  const pager = usePagination(clients, 10, period.key);
  const revenue = clients.reduce((t, c) => t + c.revenue, 0);
  const visits = clients.reduce((t, c) => t + c.visits, 0);

  return (
    <div>
      <PageHeader title="100 meilleurs clients" description="Classés par chiffre d'affaires sur la période." actions={<PeriodFilter defaultPeriod="all" />} />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {clients.length === 0 ? (
          <EmptyState title="Aucune donnée sur cette période" />
        ) : (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-1 sm:grid-cols-3">
              <StatCard info="Total payé par ces clients sur la période." label="Chiffre d'affaires cumulé" value={formatMoney(revenue)} />
              <StatCard info="Nombre de rendez vous honorés par ces clients." label="Visites" value={visits} />
              <StatCard info="Chiffre d’affaires divisé par le nombre de visites." label="Panier moyen par visite" value={formatMoney(visits ? revenue / visits : 0)} />
            </div>
            <Card title="Top 10 par chiffre d'affaires">
              <BarChartView
                layout="vertical"
                height={320}
                data={clients.slice(0, 10).map((c) => ({ name: personName(c), revenue: c.revenue }))}
                x="name"
                series={[{ key: 'revenue', label: "Chiffre d'affaires" }]}
                format={formatMoney}
              />
            </Card>
            <Table head={['#', 'Client', 'Contact', 'Visites', "Chiffre d'affaires", 'Dernière visite']}>
              {pager.pageItems.map((c, i) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 tabular-nums text-neutral-400">{pager.offset + i + 1}</td>
                  <td className="px-5 py-3 font-medium text-neutral-950">{personName(c)}</td>
                  <td className="px-5 py-3 text-neutral-600">{c.phone ?? c.email}</td>
                  <td className="px-5 py-3 tabular-nums">{c.visits}</td>
                  <td className="px-5 py-3 tabular-nums font-medium">{formatMoney(c.revenue)}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(c.lastVisit)}</td>
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
