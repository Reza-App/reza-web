'use client';

import { useState } from 'react';
import { ShareBars } from '@/components/charts/Charts';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { statsService } from '@/lib/api/services/stats.service';
import { personName } from '@/lib/format';

const EMPTY: never[] = [];

export default function FrequencyPage() {
  const period = usePeriod('year');
  const query = useApiQuery(`frequency:${period.key}`, (signal) => statsService.frequency(period.query, signal));
  const buckets = query.data?.frequencyBuckets ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const bucket = buckets.find((b) => b.type === selected) ?? buckets.find((b) => b.count > 0);
  const pager = usePagination(bucket?.clients ?? EMPTY, 10, `${period.key}|${bucket?.type ?? ''}`);
  const total = buckets.reduce((t, b) => t + b.count, 0);

  return (
    <div>
      <PageHeader title="Fréquences globales" description="Répartition de vos clients selon leur nombre de visites sur la période." actions={<PeriodFilter defaultPeriod="year" />} />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {total === 0 ? (
          <EmptyState title="Aucun client" />
        ) : (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 lg:grid-cols-4">
              {buckets.map((b) => (
                <StatCard key={b.type} info={`Clients ${b.desc.toLowerCase()} sur la période.`} label={b.type} value={b.count} hint={b.desc} onSelect={() => setSelected(b.type)} selected={bucket?.type === b.type} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
              <Card title="Répartition">
                <ShareBars items={buckets.map((b) => ({ label: `${b.type} (${b.desc})`, value: b.count }))} />
              </Card>
              {bucket && (
                <Card title={`${bucket.type} : ${bucket.count} client${bucket.count > 1 ? 's' : ''}`}>
                  {bucket.clients.length === 0 ? (
                    <p className="text-sm text-neutral-500">Aucun client dans cette catégorie.</p>
                  ) : (
                    <Table head={['Client', 'Contact', 'Visites']}>
                      {pager.pageItems.map((c) => (
                        <tr key={c.id}>
                          <td className="px-5 py-2.5 font-medium text-neutral-950">{personName(c)}</td>
                          <td className="px-5 py-2.5 text-neutral-600">{c.phone ?? c.email}</td>
                          <td className="px-5 py-2.5 tabular-nums">{c.visits}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                  <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="clients" onChange={pager.setPage} />
                </Card>
              )}
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
