'use client';

import { BarChartView } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';
import { formatMoney, formatPercent } from '@/lib/format';

export default function ServiceStatsPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`stats-services:${period.key}`, (signal) => statsService.services(period.query, signal));
  const d = query.data;
  const items = d?.prestationsData.flatMap((c) => c.items.map((i) => ({ ...i, category: c.category }))) ?? [];
  const pager = usePagination(items, 10, period.key);

  return (
    <div>
      <PageHeader title="Statistiques des prestations" description="Volume et chiffre d'affaires de chaque prestation." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && items.length === 0 && <EmptyState title="Aucune prestation réalisée sur cette période" />}
        {d && items.length > 0 && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Nombre de prestations réalisées sur la période." label="Prestations" value={d.totalPrestations} />
              <StatCard info="Rendez vous pris par votre équipe, au salon ou par téléphone." label="Au salon" value={d.prisEnSalon} />
              <StatCard info="Rendez vous réservés par les clients depuis l’application Selia." label="En ligne" value={d.prisEnLigne} />
              <StatCard info="Part des rendez vous réservés en ligne par les clients." label="Part en ligne" value={formatPercent(d.tauxEnLigne, 1)} />
            </div>
            <Card title="Prestations au salon et en ligne">
              <BarChartView
                layout="vertical"
                height={Math.max(220, items.length * 44)}
                data={items}
                x="name"
                series={[
                  { key: 'salon', label: 'Au salon' },
                  { key: 'ligne', label: 'En ligne' },
                ]}
              />
            </Card>
            <Table head={['Prestation', 'Catégorie', 'Total', 'Au salon', 'En ligne', 'Part en ligne', "Chiffre d'affaires"]}>
              {pager.pageItems.map((i) => (
                <tr key={`${i.category}-${i.name}`}>
                  <td className="px-5 py-3 font-medium text-neutral-950">{i.name}</td>
                  <td className="px-5 py-3 text-neutral-500">{i.category}</td>
                  <td className="px-5 py-3 tabular-nums">{i.total}</td>
                  <td className="px-5 py-3 tabular-nums">{i.salon}</td>
                  <td className="px-5 py-3 tabular-nums">{i.ligne}</td>
                  <td className="px-5 py-3 tabular-nums">{formatPercent(i.taux, 1)}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(i.revenue)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="prestations" onChange={pager.setPage} />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
