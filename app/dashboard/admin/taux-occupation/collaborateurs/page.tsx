'use client';

import { ShareBars } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Avatar, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { statsService } from '@/lib/api/services/stats.service';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';

function Meter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-neutral-950" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tabular-nums">{formatPercent(value, 1)}</span>
    </div>
  );
}

export default function OccupancyCollaboratorsPage() {
  const period = usePeriod('month');
  const query = useApiQuery(`occupancy-collab:${period.key}`, (signal) => statsService.occupancyCollaborators(period.query, signal));
  const d = query.data;

  return (
    <div>
      <PageHeader title="Occupation des collaborateurs" description="Temps réservé rapporté au temps de travail de chacun." actions={<PeriodFilter />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && d.collaborators.length === 0 && <EmptyState title="Aucune activité sur cette période" />}
        {d && d.collaborators.length > 0 && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Part du temps de travail réservée par des rendez vous." label="Occupation moyenne" value={formatPercent(d.totals.occupationRate, 1)} />
              <StatCard info="Temps total occupé par des rendez vous." label="Heures réservées" value={`${formatNumber(d.totals.workedHours, 1)} h`} />
              <StatCard info="Rendez vous de la période, hors annulations." label="Rendez vous" value={d.totals.appointmentCount} />
              <StatCard info="Montant des prestations facturées et payées sur la période." label="Chiffre d'affaires" value={formatMoney(d.totals.revenue)} />
            </div>
            <Table head={['Collaborateur', 'Occupation', 'Heures réservées', 'Rendez vous', "Chiffre d'affaires"]}>
              {d.collaborators.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} src={c.avatar} size={32} />
                      <span className="font-medium text-neutral-950">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Meter value={c.occupationRate} />
                  </td>
                  <td className="px-5 py-3 tabular-nums">{formatNumber(c.workedHours, 1)} h</td>
                  <td className="px-5 py-3 tabular-nums">{c.appointmentCount}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(c.revenue)}</td>
                </tr>
              ))}
            </Table>
            <Card title="Répartition des heures réservées">
              <ShareBars items={d.collaborators.map((c) => ({ label: c.name, value: c.workedHours }))} format={(v) => `${formatNumber(v, 1)} h`} />
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
