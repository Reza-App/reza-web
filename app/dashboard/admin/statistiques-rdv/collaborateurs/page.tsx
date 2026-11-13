'use client';

import { BarChartView } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Avatar, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { statsService } from '@/lib/api/services/stats.service';
import { formatMoney, formatPercent } from '@/lib/format';

export default function CollaboratorStatsPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`stats-collab:${period.key}`, (signal) => statsService.collaborators(period.query, signal));
  const d = query.data;

  return (
    <div>
      <PageHeader title="Statistiques des collaborateurs" description="Prestations réalisées et chiffre d'affaires par collaborateur." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && d.collaborators.length === 0 && <EmptyState title="Aucune activité sur cette période" />}
        {d && d.collaborators.length > 0 && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Nombre de prestations réalisées sur la période." label="Prestations" value={d.totals.totalServices} />
              <StatCard info="Rendez vous pris par votre équipe, au salon ou par téléphone." label="Au salon" value={d.totals.inSalon} />
              <StatCard info="Rendez vous réservés par les clients depuis l’application Selia." label="En ligne" value={d.totals.online} hint={formatPercent(d.totals.onlineRate, 1)} />
              <StatCard info="Montant des prestations facturées et payées sur la période." label="Chiffre d'affaires" value={formatMoney(d.totals.revenue)} />
            </div>
            <Card title="Chiffre d'affaires par collaborateur">
              <BarChartView layout="vertical" height={Math.max(200, d.collaborators.length * 48)} data={d.collaborators} x="name" series={[{ key: 'revenue', label: "Chiffre d'affaires" }]} format={formatMoney} />
            </Card>
            <Table head={['Collaborateur', 'Prestations', 'Au salon', 'En ligne', 'Part en ligne', "Chiffre d'affaires"]}>
              {d.collaborators.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} src={c.avatar} size={32} />
                      <span className="font-medium text-neutral-950">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 tabular-nums">{c.totalServices}</td>
                  <td className="px-5 py-3 tabular-nums">{c.inSalon}</td>
                  <td className="px-5 py-3 tabular-nums">{c.online}</td>
                  <td className="px-5 py-3 tabular-nums">{formatPercent(c.onlineRate, 1)}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(c.revenue)}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
