'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Pagination, Table } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { JOURNAL_ACTIONS, type JournalEntry, platformService } from '@/lib/api/services/platform.service';
import { formatDateTime } from '@/lib/format';

/** A short line with what was changed, when the entry carries it. */
function detail(e: JournalEntry): string | null {
  const m = e.metadata ?? {};
  if (e.action === 'platform.subscription') {
    if (m.action === 'extend') return `+${m.months} mois`;
    if (m.action === 'setEnd') return `fin fixée au ${new Date(String(m.date)).toLocaleDateString('fr-FR')}`;
    if (m.action === 'cancel') return 'résilié';
    if (m.action === 'reactivate') return 'réactivé';
  }
  if (e.action === 'platform.salon-coverage') return m.covered ? 'activation offerte' : 'activation retirée';
  if (e.action === 'platform.account' && typeof m.isActive === 'boolean') return m.isActive ? 'compte réactivé' : 'compte désactivé';
  if (e.action === 'platform.featured') return m.featured ? 'mis en avant' : 'retiré de la une';
  if (e.action === 'platform.admin-active') return m.isActive ? 'rétabli' : 'suspendu';
  if (e.action === 'platform.payment-reject' && m.reason) return `motif : ${String(m.reason)}`;
  if (e.action === 'platform.invoice-issue' && m.invoice) return String(m.invoice);
  return null;
}

export default function PlatformJournalPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const query = useApiQuery(`platform-journal:${action}:${page}`, (signal) => platformService.journal({ page, action: action || undefined }, signal));
  const entries = query.data?.entries ?? [];

  return (
    <div>
      <PageHeader title="Journal" description="Les actions de l'administration Selia : qui a fait quoi, et quand." />
      <div className="mb-5">
        <Select
          className="w-72"
          aria-label="Type d'action"
          value={action}
          onValueChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        >
          <option value="">Toutes les actions</option>
          {Object.entries(JOURNAL_ACTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {entries.length === 0 ? (
          <EmptyState title="Aucune action" description="Les actions de l'administration apparaîtront ici." />
        ) : (
          <Table head={['Date', 'Action', 'Concerne', 'Par']}>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDateTime(e.createdAt)}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-neutral-950">{JOURNAL_ACTIONS[e.action] ?? e.action}</p>
                  {detail(e) && <p className="text-xs text-neutral-500">{detail(e)}</p>}
                </td>
                <td className="px-5 py-3 text-neutral-700">
                  {e.targetType === 'account' && e.targetId ? (
                    <Link href={`/plateforme/etablissements/${encodeURIComponent(e.targetId)}`} className="hover:underline">
                      {e.target}
                    </Link>
                  ) : (
                    e.target ?? '-'
                  )}
                </td>
                <td className="px-5 py-3 text-neutral-700">{e.actor ?? '-'}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={30} label="actions" onChange={setPage} />
      </QueryBoundary>
    </div>
  );
}
