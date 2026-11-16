'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { SecondaryButton } from '@/components/ui/modal';
import { Badge, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { platformService } from '@/lib/api/services/platform.service';
import { INVOICE_STATUS_LABELS } from '@/lib/api/services/invoice.service';
import { downloadCsv } from '@/lib/csv';
import { formatDate, formatMoney, personName } from '@/lib/format';
import { INVOICE_STATUS_TONES, statusTone } from '@/lib/status';

/** The last 12 months, newest first ("2026-11"), plus "all". */
function monthOptions(now = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

/** First and last day of a "YYYY-MM" month. */
function monthRange(month: string) {
  if (month === 'all') return {};
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export default function PlatformInvoicesPage() {
  const months = useMemo(() => monthOptions(), []);
  const [month, setMonth] = useState(months[0]!.value);
  const query = useApiQuery(`platform-invoices:${month}`, (signal) => platformService.invoices(monthRange(month), signal));
  const invoices = query.data?.invoices ?? [];
  const pager = usePagination(invoices, 20, month);
  const label = month === 'all' ? 'toutes périodes' : months.find((m) => m.value === month)?.label.toLowerCase();

  const exportCsv = () =>
    downloadCsv(
      `factures-selia-${month}.csv`,
      ['Numéro', 'Date', 'Établissement', 'Propriétaire', 'Email', 'Période du', 'Période au', 'Détail', 'Montant (DH)', 'Statut'],
      invoices.map((i) => [
        i.invoiceNumber,
        formatDate(i.createdAt),
        i.salon ?? '',
        personName(i.owner),
        i.owner?.email ?? '',
        formatDate(i.periodStart),
        formatDate(i.periodEnd),
        i.items.map((it) => `${it.serviceName} ${it.price}`).join(' ; '),
        i.total,
        (INVOICE_STATUS_LABELS as Record<string, string>)[i.status] ?? i.status,
      ]),
    );

  return (
    <div>
      <PageHeader
        title="Factures Selia"
        description="Toutes les factures d'abonnement émises aux établissements, à exporter pour la comptabilité."
        actions={
          <>
            <SecondaryButton onClick={() => window.print()} disabled={!invoices.length} className="no-print">
              <Printer size={16} /> Imprimer
            </SecondaryButton>
            <SecondaryButton onClick={exportCsv} disabled={!invoices.length} className="no-print">
              <Download size={16} /> Exporter
            </SecondaryButton>
          </>
        }
      />
      <div className="no-print mb-5 flex flex-wrap items-center gap-3">
        <Select className="w-56" aria-label="Mois" value={month} onValueChange={setMonth}>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
          <option value="all">Toutes les factures</option>
        </Select>
      </div>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        <div className="stagger stat-grid mb-6 grid-cols-2 xl:grid-cols-3">
          <StatCard label="Factures" value={invoices.length} hint={label} />
          <StatCard label="Encaissé" value={formatMoney(query.data?.total ?? 0)} hint={label} />
          <StatCard label="Établissements facturés" value={new Set(invoices.map((i) => i.accountId)).size} hint={label} />
        </div>
        {invoices.length === 0 ? (
          <EmptyState title="Aucune facture" description="Les factures sont émises à la validation des virements." />
        ) : (
          <Table head={['Numéro', 'Date', 'Établissement', 'Période', 'Statut', 'Montant']}>
            {invoices.map((i, index) => (
              <tr key={i.id} className={pager.rowClass(index)}>
                <td className="px-5 py-3 font-medium text-neutral-950">{i.invoiceNumber}</td>
                <td className="whitespace-nowrap px-5 py-3">{formatDate(i.createdAt)}</td>
                <td className="px-5 py-3">
                  {i.accountId ? (
                    <Link href={`/plateforme/etablissements/${encodeURIComponent(i.accountId)}`} className="font-medium text-neutral-900 hover:underline">
                      {i.salon ?? '-'}
                    </Link>
                  ) : (
                    i.salon ?? '-'
                  )}
                  <p className="text-xs text-neutral-500">{personName(i.owner)}</p>
                </td>
                <td className="px-5 py-3 text-neutral-600">{i.periodStart ? `${formatDate(i.periodStart)} au ${formatDate(i.periodEnd)}` : '-'}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone(INVOICE_STATUS_TONES, i.status)}>{(INVOICE_STATUS_LABELS as Record<string, string>)[i.status] ?? i.status}</Badge>
                </td>
                <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(i.total)}</td>
              </tr>
            ))}
          </Table>
        )}
        <div className="no-print">
          <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="factures" onChange={pager.setPage} />
        </div>
      </QueryBoundary>
    </div>
  );
}
