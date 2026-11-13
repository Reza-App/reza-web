'use client';

import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';
import { formatMoney, formatPercent } from '@/lib/format';

export default function OccupancyServicesPage() {
  const period = usePeriod('month');
  const query = useApiQuery(`occupancy-services:${period.key}`, (signal) => statsService.occupancyServices(period.query, signal));
  const d = query.data;
  const rows = d?.servicesData.flatMap((c) => c.services.map((s) => ({ ...s, category: c.category }))) ?? [];
  const pager = usePagination(rows, 10, period.key);

  return (
    <div>
      <PageHeader title="Occupation par prestation" description="Temps de travail consacré à chaque prestation." actions={<PeriodFilter />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && rows.length === 0 && <EmptyState title="Aucune prestation réalisée sur cette période" />}
        {d && rows.length > 0 && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Part du temps de travail réservée par des rendez vous." label="Occupation moyenne" value={formatPercent(d.stats.avgOccupancy, 1)} />
              <StatCard info="Temps total occupé par des rendez vous." label="Heures réservées" value={`${d.stats.totalHours} h`} />
              <StatCard info="Rendez vous de la période, hors annulations." label="Rendez vous" value={d.stats.totalAppointmentCount} />
              <StatCard info="Montant des prestations facturées et payées sur la période." label="Chiffre d'affaires" value={formatMoney(d.stats.totalRevenue)} />
            </div>
            <Table head={['Prestation', 'Catégorie', 'Occupation', 'Temps', 'Rendez vous', "Chiffre d'affaires"]}>
              {pager.pageItems.map((s) => (
                <tr key={`${s.category}-${s.name}`}>
                  <td className="px-5 py-3 font-medium text-neutral-950">{s.name}</td>
                  <td className="px-5 py-3 text-neutral-500">{s.category}</td>
                  <td className="px-5 py-3 tabular-nums">{formatPercent(s.occupancyRate, 1)}</td>
                  <td className="px-5 py-3 tabular-nums">{s.hoursWorked}</td>
                  <td className="px-5 py-3 tabular-nums">{s.appointmentCount}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(s.totalRevenue)}</td>
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
