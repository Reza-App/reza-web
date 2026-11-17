'use client';

import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Badge, PageHeader, Pagination, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { SecondaryButton } from '@/components/ui/modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { INVOICE_STATUS_LABELS } from '@/lib/api/services/invoice.service';
import { subscriptionService } from '@/lib/api/services/subscription.service';
import { formatDate, formatMoney } from '@/lib/format';
import { INVOICE_STATUS_TONES, statusTone } from '@/lib/status';
import { paymentMethodLabel } from '@/lib/types/cash';

export default function SubscriptionInvoicesPage() {
  const query = useApiQuery('subscription-invoices', (signal) => subscriptionService.invoices(signal));
  const invoices = query.data ?? [];
  const pager = usePagination(invoices);

  return (
    <div>
      <PageHeader
        title="Factures Selia"
        description="Factures de votre abonnement Selia."
        actions={
          <SecondaryButton onClick={() => window.print()} disabled={!invoices.length} className="no-print">
            <Printer size={16} /> Imprimer
          </SecondaryButton>
        }
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {invoices.length === 0 ? (
          <EmptyState title="Aucune facture" description="Vos factures d'abonnement apparaîtront ici après validation de vos paiements." />
        ) : (
          <Table head={['Numéro', 'Date', 'Période', 'Moyen', 'Statut', 'Montant']}>
            {invoices.map((i, index) => {
              const period = i as typeof i & { periodStart?: string | null; periodEnd?: string | null };
              return (
                <tr key={i.id} className={pager.rowClass(index)}>
                  <td className="px-5 py-3 font-medium text-neutral-950">
                    <Link href={`/dashboard/admin/mes-factures/liste-des-factures/${encodeURIComponent(i.id)}`} className="hover:underline">
                      {i.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{formatDate(i.createdAt)}</td>
                  <td className="px-5 py-3 text-neutral-600">
                    {period.periodStart ? `${formatDate(period.periodStart)} au ${formatDate(period.periodEnd)}` : '-'}
                  </td>
                  <td className="px-5 py-3">{paymentMethodLabel(i.paymentMethod)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(INVOICE_STATUS_TONES, i.status)}>{INVOICE_STATUS_LABELS[i.status] ?? i.status}</Badge>
                  </td>
                  <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(i.total)}</td>
                </tr>
              );
            })}
          </Table>
        )}
        <div className="no-print">
          <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="factures" onChange={pager.setPage} />
        </div>
      </QueryBoundary>
    </div>
  );
}
