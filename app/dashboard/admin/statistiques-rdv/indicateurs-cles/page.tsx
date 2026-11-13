'use client';

import { BarChartView, LineChartView, ShareBars } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Avatar, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { statsService } from '@/lib/api/services/stats.service';
import { formatDuration, formatMoney, formatNumber, formatPercent } from '@/lib/format';

function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const sign = value > 0 ? 'en hausse de' : value < 0 ? 'en baisse de' : 'stable';
  return <>{value === 0 ? sign : `${sign} ${formatNumber(Math.abs(value), 1)} %`} sur la période précédente</>;
}

export default function KeyIndicatorsPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`stats-dashboard:${period.key}`, (signal) => statsService.dashboard(period.query, signal));
  const d = query.data;

  return (
    <div>
      <PageHeader title="Indicateurs clés" description="Vue d'ensemble de l'activité de votre salon." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="Rendez vous de la période, hors annulations." label="Rendez vous" badge={{ label: 'Période', tone: 'sky' }} value={d.totalAppointments} hint={<Delta value={d.deltas.totalAppointments} />} />
              <StatCard info="Montant des prestations facturées et payées sur la période." label="Chiffre d'affaires" tone="green" value={formatMoney(d.totalRevenue)} hint={`Panier moyen ${formatMoney(d.avgBasket)}`} />
              <StatCard info="Part des rendez vous réservés par les clients depuis l’application." label="Réservés en ligne" badge={{ label: 'Web', tone: 'violet' }} value={formatPercent(d.onlineRate, 1)} hint={`${d.onlineAppointments} rendez vous`} />
              <StatCard info="Note moyenne des avis reçus sur la période." label="Satisfaction" badge={{ label: 'Avis', tone: 'green' }} value={`${formatNumber(d.avgSatisfaction, 1)} / 5`} />
              <StatCard info="Part des rendez vous honorés par les clients." label="Taux de présence" value={formatPercent(d.attendanceRate, 1)} hint={<Delta value={d.deltas.attendanceRate} />} />
              <StatCard info="Part des rendez vous annulés sur la période." label="Taux d'annulation" tone="red" value={formatPercent(d.cancellationRate, 1)} />
              <StatCard info="Part des clients revenus au moins deux fois sur la période." label="Fidélité" value={formatPercent(d.loyaltyRate, 1)} hint={`${d.loyalClientsCount} clients fidèles`} />
              <StatCard info="Durée moyenne d’un rendez vous, toutes prestations comprises." label="Durée moyenne" value={formatDuration(d.avgDuration)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Rendez vous par mois">
                <BarChartView
                  data={d.appointmentsTrend}
                  x="day"
                  series={[
                    { key: 'salon', label: 'Au salon' },
                    { key: 'online', label: 'En ligne' },
                  ]}
                />
              </Card>
              <Card title="Chiffre d'affaires par mois">
                <LineChartView area data={d.revenueData} x="name" series={[{ key: 'value', label: "Chiffre d'affaires" }]} format={formatMoney} />
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Prestations les plus demandées">
                <ShareBars items={d.serviceData.map((s) => ({ label: s.name, value: s.value }))} />
              </Card>
              <Card title="Créneaux les plus réservés">
                <BarChartView data={d.timeSlotData} x="slot" series={[{ key: 'count', label: 'Rendez vous' }]} height={220} />
              </Card>
              <Card title="Canaux de réservation">
                <ShareBars items={d.bookingChannels.map((c) => ({ label: c.channel, value: c.count }))} />
              </Card>
            </div>

            <Card title="Collaborateurs">
              <Table head={['Collaborateur', 'Rendez vous', "Chiffre d'affaires", 'Note']}>
                {d.employeeData.map((e) => (
                  <tr key={e.name}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} src={e.avatar} size={32} />
                        <span className="font-medium text-neutral-950">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{e.appointments}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(e.revenue)}</td>
                    <td className="px-5 py-3 tabular-nums">{e.rating ? `${formatNumber(e.rating, 1)} / 5` : '-'}</td>
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
