'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BarChartView } from '@/components/charts/Charts';
import { Badge, Card, PageHeader, StatCard } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { platformService, WATCH_LABELS, type WatchState } from '@/lib/api/services/platform.service';
import { formatDate, formatMoney, formatNumber, personName } from '@/lib/format';

const monthLabel = (month: string) =>
  new Date(`${month}-15T00:00:00Z`).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '');

/** Money received month by month, and the accounts whose renewal needs a look. */
function BillingWatchSection() {
  const query = useApiQuery('platform-billing-watch', (signal) => platformService.billingWatch(signal));
  const [filter, setFilter] = useState<WatchState | 'todo'>('todo');
  const w = query.data;
  const todo: WatchState[] = ['grace', 'renew', 'expired', 'none'];
  const rows = (w?.accounts ?? []).filter((a) => (filter === 'todo' ? todo.includes(a.state) : a.state === filter));
  const year = (w?.revenue ?? []).reduce((t, r) => t + r.total, 0);

  return (
    <QueryBoundary loading={query.loading && !w} error={query.error} onRetry={query.refetch}>
      {w && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card title="Chiffre d'affaires par mois">
            <p className="-mt-2 mb-4 text-sm text-neutral-500">
              {formatMoney(year)} sur les 12 derniers mois, virements validés.
            </p>
            <BarChartView
              data={w.revenue.map((r) => ({ mois: monthLabel(r.month), total: r.total }))}
              x="mois"
              series={[{ key: 'total', label: "Chiffre d'affaires" }]}
              format={(v) => formatMoney(v)}
              tickFormat={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('fr-FR')} k` : String(v))}
              height={240}
            />
          </Card>
          <Card title="Échéances à suivre">
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  ['todo', 'À traiter', todo.reduce((t, s) => t + w.counts[s], 0)],
                  ['grace', WATCH_LABELS.grace.label, w.counts.grace],
                  ['renew', WATCH_LABELS.renew.label, w.counts.renew],
                  ['expired', WATCH_LABELS.expired.label, w.counts.expired],
                  ['active', WATCH_LABELS.active.label, w.counts.active],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${filter === value ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                >
                  {label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">Rien à signaler.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto">
                {rows.map((a) => (
                  <li key={a.accountId}>
                    <Link href={`/plateforme/etablissements/${encodeURIComponent(a.accountId)}`} className="flex items-center justify-between gap-3 py-3 hover:bg-neutral-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-950">{a.salons.join(', ') || 'Compte sans salon'}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {personName(a.owner)}
                          {a.currentPeriodEnd ? `, fin le ${formatDate(a.currentPeriodEnd)}` : ''}
                          {a.pendingPayment ? ', virement à vérifier' : ''}
                        </span>
                      </span>
                      <Badge tone={WATCH_LABELS[a.state].tone}>{WATCH_LABELS[a.state].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </QueryBoundary>
  );
}

export default function PlatformOverviewPage() {
  const query = useApiQuery('platform-overview', (signal) => platformService.overview(signal));
  const d = query.data;

  return (
    <div>
      <PageHeader title="Vue d'ensemble" description="Activité de la plateforme Selia, tous établissements confondus." />
      <QueryBoundary loading={query.loading && !d} error={query.error} onRetry={query.refetch}>
        {d && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard
                info="Établissements inscrits sur la plateforme, dont ceux avec un abonnement en cours."
                label="Établissements"
                value={formatNumber(d.salons)}
                hint={`${d.activeSubscriptions} abonné${d.activeSubscriptions > 1 ? 's' : ''}, ${d.newSalonsThisMonth} nouveau${d.newSalonsThisMonth > 1 ? 'x' : ''} ce mois`}
              />
              <StatCard
                info="Abonnements Selia validés depuis le début du mois."
                label="Chiffre d'affaires"
                tone="green"
                value={formatMoney(d.revenueThisMonth)}
                hint={`Ce mois, ${d.paymentsThisMonth} paiement${d.paymentsThisMonth > 1 ? 's' : ''}`}
              />
              <StatCard
                info="Virements déclarés par les établissements et pas encore vérifiés."
                label="Paiements à vérifier"
                tone={d.pendingPayments > 0 ? 'amber' : 'default'}
                badge={d.pendingPayments > 0 ? { label: 'À traiter', tone: 'amber' } : undefined}
                value={formatNumber(d.pendingPayments)}
              />
              <StatCard
                info="Rendez vous du mois en cours sur tous les établissements, hors annulations."
                label="Rendez vous ce mois"
                value={formatNumber(d.appointmentsThisMonth)}
                hint={`${formatNumber(d.clients)} clients au total`}
              />
            </div>

            <BillingWatchSection />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Paiements">
                <p className="text-sm text-neutral-600">
                  {d.pendingPayments > 0
                    ? `${d.pendingPayments} paiement${d.pendingPayments > 1 ? 's' : ''} attend${d.pendingPayments > 1 ? 'ent' : ''} votre vérification.`
                    : 'Aucun paiement en attente.'}
                </p>
                <Link href="/plateforme/paiements" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-950 hover:underline">
                  Voir les paiements <ArrowRight size={15} />
                </Link>
              </Card>
              <Card title="Établissements">
                <p className="text-sm text-neutral-600">Activer un compte, mettre un salon en avant, suivre son activité.</p>
                <Link href="/plateforme/etablissements" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-950 hover:underline">
                  Voir les établissements <ArrowRight size={15} />
                </Link>
              </Card>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
