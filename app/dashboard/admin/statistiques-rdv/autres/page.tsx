'use client';

import { ShareBars } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Avatar, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { statsService } from '@/lib/api/services/stats.service';
import { formatDuration, formatPercent } from '@/lib/format';

const toItems = (list: { name: string; value: number }[]) => list.map((i) => ({ label: i.name, value: i.value }));

export default function OtherIndicatorsPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`stats-others:${period.key}`, (signal) => statsService.others(period.query, signal));
  const d = query.data;

  return (
    <div>
      <PageHeader title="Autres indicateurs" description="Origine des réservations, par collaborateur et par prestation." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Rendez vous de la période, hors annulations." label="Rendez vous" value={d.totalRDV} />
              <StatCard info="Collaborateurs avec au moins un rendez vous sur la période." label="Collaborateurs actifs" value={d.activeCollaborateurs} />
              <StatCard info="Nombre de prestations de votre carte." label="Prestations proposées" value={d.totalServices} />
              <StatCard info="Durée moyenne d’un rendez vous, toutes prestations comprises." label="Durée moyenne" value={formatDuration(d.avgDuration)} />
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Origine des rendez vous">
                <ShareBars items={toItems(d.rdvPrisData)} format={(v) => formatPercent(v)} />
              </Card>
              <Card title="Prestations au salon par collaborateur">
                <ShareBars items={toItems(d.prestationsSalonData)} />
              </Card>
              <Card title="Prestations en ligne par collaborateur">
                <ShareBars items={toItems(d.prestationsLigneData)} />
              </Card>
              <Card title="Rendez vous au salon par prestation">
                <ShareBars items={toItems(d.rdvSalonParPrestationData)} />
              </Card>
              <Card title="Rendez vous en ligne par prestation">
                <ShareBars items={toItems(d.rdvLigneParPrestationData)} />
              </Card>
              <Card title="Total par prestation">
                <ShareBars items={toItems(d.totalRdvParPrestationData)} />
              </Card>
            </div>
            <Card title="Performance des collaborateurs">
              <Table head={['Collaborateur', 'Rendez vous', 'Prestations', 'Part en ligne']}>
                {d.performanceData.map((p) => (
                  <tr key={p.name}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={p.avatar} size={32} />
                        <span className="font-medium text-neutral-950">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{p.rdv}</td>
                    <td className="px-5 py-3 tabular-nums">{p.prestations}</td>
                    <td className="px-5 py-3 tabular-nums">{formatPercent(p.taux)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
