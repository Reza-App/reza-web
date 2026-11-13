'use client';

import { useState } from 'react';
import { PageHeader, Pagination, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api/client';
import type { Pagination as PageInfo } from '@/lib/types/api';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 20;

interface AuditLog {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  userName?: string | null;
  ip?: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.login_failed': 'Mot de passe erroné',
  'auth.account_locked': 'Compte verrouillé',
  'appointment.cancel': 'Rendez vous annulé',
  'cash.create': 'Mouvement de caisse',
  'cash.delete': 'Mouvement de caisse supprimé',
  'client.delete': 'Client supprimé',
  'client.merge': 'Fiches clients fusionnées',
  'employee.delete': 'Collaborateur supprimé',
  'invoice.update': 'Facture modifiée',
  'review.status': 'Avis modéré',
  'review.delete': 'Avis supprimé',
  'service.delete': 'Prestation supprimée',
  'tenant.update': 'Descriptif modifié',
  'tenant.settings_update': 'Réglages modifiés',
};

export default function AuditJournalPage() {
  const [page, setPage] = useState(1);
  const query = useApiQuery(`audit:${page}`, (signal) =>
    api.get<{ logs: AuditLog[]; pagination: PageInfo }>('backend/tenant/audit-logs', { query: { page, limit: PAGE_SIZE }, signal }),
  );
  const logs = query.data?.logs ?? [];

  return (
    <div>
      <PageHeader title="Journal d'activité" description="Actions sensibles réalisées sur votre salon : qui, quoi, quand." />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {logs.length === 0 ? (
          <EmptyState title="Aucune activité enregistrée" />
        ) : (
          <Table head={['Date', 'Action', 'Par', 'Élément', 'Adresse IP']}>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDateTime(log.createdAt)}</td>
                <td className="px-5 py-3 font-medium text-neutral-950">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-5 py-3">{log.userName ?? 'Système'}</td>
                <td className="px-5 py-3 font-mono text-xs text-neutral-500">{log.entityId ? `${log.entityType} ${log.entityId.slice(0, 10)}` : ''}</td>
                <td className="px-5 py-3 font-mono text-xs text-neutral-500">{log.ip}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={PAGE_SIZE} label="actions" onChange={setPage} />
      </QueryBoundary>
    </div>
  );
}
