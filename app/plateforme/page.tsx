'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, PageHeader, StatCard } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { platformService } from '@/lib/api/services/platform.service';
import { formatMoney, formatNumber } from '@/lib/format';

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
                info="Établissements inscrits sur la plateforme, actifs ou non."
                label="Établissements"
                value={formatNumber(d.salons)}
                hint={`${d.activeSalons} actifs, ${d.newSalonsThisMonth} ce mois`}
              />
              <StatCard
                info="Comptes propriétaires (un compte peut gérer plusieurs établissements)."
                label="Comptes"
                value={formatNumber(d.accounts)}
                hint={`${d.activeAccounts} actifs`}
              />
              <StatCard
                info="Abonnements Selia au statut actif."
                label="Abonnements actifs"
                tone="green"
                value={formatNumber(d.activeSubscriptions)}
              />
              <StatCard
                info="Paiements d'abonnement déclarés par les établissements et pas encore vérifiés."
                label="Paiements à vérifier"
                tone={d.pendingPayments > 0 ? 'amber' : 'default'}
                badge={d.pendingPayments > 0 ? { label: 'À traiter', tone: 'amber' } : undefined}
                value={formatNumber(d.pendingPayments)}
              />
              <StatCard
                info="Paiements d'abonnement validés depuis le début du mois."
                label="Encaissé ce mois"
                tone="green"
                value={formatMoney(d.revenueThisMonth)}
                hint={`${d.paymentsThisMonth} paiement${d.paymentsThisMonth > 1 ? 's' : ''} validé${d.paymentsThisMonth > 1 ? 's' : ''}`}
              />
              <StatCard
                info="Rendez vous du mois en cours sur tous les établissements, hors annulations."
                label="Rendez vous ce mois"
                value={formatNumber(d.appointmentsThisMonth)}
              />
              <StatCard info="Fiches clients sur l'ensemble des établissements." label="Clients" value={formatNumber(d.clients)} />
              <StatCard
                info="Établissements mis en avant sur l'accueil de l'application client."
                label="Mis en avant"
                tone="violet"
                value={formatNumber(d.featuredSalons)}
              />
            </div>

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
