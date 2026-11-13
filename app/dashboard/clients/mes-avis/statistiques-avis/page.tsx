'use client';

import { useMemo } from 'react';
import { BarChartView, LineChartView, ShareBars } from '@/components/charts/Charts';
import { Stars } from '@/components/reviews/ReviewList';
import { Card, PageHeader, StatCard } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { reviewService } from '@/lib/api/services/review.service';
import { formatNumber, formatPercent } from '@/lib/format';

const MONTHS = 12;

export default function ReviewStatsPage() {
  const query = useApiQuery('review-stats', (signal) => reviewService.stats(signal));
  const stats = query.data?.stats;

  // Monthly volume and average note over the last twelve months.
  const trend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, mois: d.toLocaleDateString('fr-FR', { month: 'short' }), avis: 0, total: 0, note: 0 };
    });
    for (const r of query.data?.reviews ?? []) {
      const d = new Date(r.createdAt);
      const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (!bucket) continue;
      bucket.avis += 1;
      bucket.total += r.rating;
    }
    return buckets.map((b) => ({ ...b, note: b.avis ? Math.round((b.total / b.avis) * 10) / 10 : null }));
  }, [query.data]);

  const moderated = stats ? stats.approvedReviews + stats.rejectedReviews : 0;

  return (
    <div>
      <PageHeader title="Statistiques des avis" description="Satisfaction de vos clients et activité de modération." />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {!stats || stats.totalReviews === 0 ? (
          <EmptyState title="Pas encore d'avis" description="Les statistiques apparaîtront dès les premiers avis de vos clients." />
        ) : (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 lg:grid-cols-4">
              <StatCard
                info="Moyenne des notes de tous les avis, de 1 à 5." label="Note moyenne"
                value={
                  <span className="flex items-center gap-3">
                    {formatNumber(stats.averageRating, 1)}
                    <Stars value={Math.round(stats.averageRating)} />
                  </span>
                }
              />
              <StatCard info="Nombre total d’avis laissés par vos clients." label="Avis reçus" badge={{ label: 'Total', tone: 'sky' }} value={stats.totalReviews} hint={`${stats.trendsLastMonth.total} le mois dernier`} />
              <StatCard
                info="Part des avis modérés qui ont été publiés." label="Taux de publication"
                tone="green"
                value={formatPercent(moderated ? (stats.approvedReviews / moderated) * 100 : 0)}
                hint={`${stats.approvedReviews} publiés, ${stats.rejectedReviews} refusés`}
              />
              <StatCard info="Avis qui attendent votre décision avant publication." label="En attente" badge={{ label: 'À suivre', tone: 'amber' }} tone="amber" value={stats.pendingReviews} hint="Avis à modérer" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Avis reçus par mois">
                <BarChartView data={trend} x="mois" series={[{ key: 'avis', label: 'Avis' }]} />
              </Card>
              <Card title="Note moyenne par mois">
                <LineChartView data={trend} x="mois" series={[{ key: 'note', label: 'Note moyenne' }]} format={(v) => formatNumber(v, 1)} yDomain={[0, 5]} />
              </Card>
            </div>

            <Card title="Répartition des notes">
              <ShareBars
                items={[...stats.ratingDistribution]
                  .sort((a, b) => b.rating - a.rating)
                  .map((d) => ({ label: `${d.rating} étoile${d.rating > 1 ? 's' : ''}`, value: d.count }))}
              />
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
