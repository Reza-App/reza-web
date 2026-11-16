'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Plus, Printer, Search } from 'lucide-react';
import { CollectDialog, MovementDialog, SaleDialog } from '@/components/caisse/CaisseDialogs';
import { ShareBars } from '@/components/charts/Charts';
import { Logo } from '@/components/brand/Logo';
import { PrimaryButton } from '@/components/ui/modal';
import { Badge, Card, PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useUrlState } from '@/hooks/useUrlState';
import { useAuth } from '@/contexts/AuthContext';
import { cashService, type Invoice, INVOICE_STATUS_LABELS, invoiceService } from '@/lib/api/services/invoice.service';
import { buildLedger, cashPeriodRange, ledgerTotals } from '@/lib/cash';
import { downloadCsv } from '@/lib/csv';
import { INVOICE_STATUS_TONES, statusTone } from '@/lib/status';
import { formatDateTime, formatMoney } from '@/lib/format';
import { ToneButton } from '@/components/ui/actions';
import { useUrlAction } from '@/hooks/useUrlAction';
import { usePagination } from '@/hooks/usePagination';
import {
  CASH_PERIOD_LABELS,
  CASH_PERIODS,
  type CashPeriod,
  LEDGER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  paymentMethodLabel,
} from '@/lib/types/cash';

export default function CaissePage() {
  const { get } = useUrlState();
  const { activeSalon } = useAuth();
  const rawPeriod = get('period', 'month') as CashPeriod;
  const period: CashPeriod = CASH_PERIODS.includes(rawPeriod) ? rawPeriod : 'month';
  const typeFilter = get('type', 'all');
  const methodFilter = get('method', 'all');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'sale' | 'movement' | null>(null);
  const [collecting, setCollecting] = useState<Invoice | null>(null);
  useUrlAction({ sale: () => setDialog('sale'), movement: () => setDialog('movement') });

  const query = useApiQuery(`caisse:${period}`, async (signal) => {
    const range = cashPeriodRange(period);
    const [invoices, cash] = await Promise.all([invoiceService.list(range, signal), cashService.list(range, signal)]);
    return buildLedger(invoices, cash.transactions);
  });
  useLiveRefresh('agenda', query.refetch);

  const ledger = useMemo(() => query.data ?? [], [query.data]);
  const totals = useMemo(() => ledgerTotals(ledger), [ledger]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ledger.filter(
      (e) =>
        (typeFilter === 'all' || e.type === typeFilter) &&
        (methodFilter === 'all' || e.method === methodFilter) &&
        (!term || e.label.toLowerCase().includes(term) || e.reference?.toLowerCase().includes(term)),
    );
  }, [ledger, typeFilter, methodFilter, search]);
  const pager = usePagination(rows, 15, `${period}|${typeFilter}|${methodFilter}|${search}`);

  const exportCsv = () =>
    downloadCsv(
      `caisse-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Type', 'Référence', 'Libellé', 'Moyen', 'Statut', 'Montant'],
      rows.map((e) => [
        formatDateTime(e.date),
        LEDGER_TYPE_LABELS[e.type],
        e.reference ?? '',
        e.label,
        paymentMethodLabel(e.method),
        e.status ? INVOICE_STATUS_LABELS[e.status] : '',
        e.amount.toFixed(2),
      ]),
    );

  return (
    <div>
      <div className="mb-6 hidden print:block">
        <Logo variant="pro" height={40} />
        <p className="mt-3 text-sm">
          {activeSalon?.name} · Rapport de caisse · {CASH_PERIOD_LABELS[period]} · imprimé le {formatDateTime(new Date())}
        </p>
      </div>

      <PageHeader
        title="Caisse"
        description={`${CASH_PERIOD_LABELS[period]} · ventes, encaissements et mouvements du tiroir.`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <ToneButton tone="green" onClick={exportCsv} disabled={!rows.length}>
              <Download size={16} /> Exporter
            </ToneButton>
            <ToneButton tone="violet" onClick={() => window.print()}>
              <Printer size={16} /> Imprimer
            </ToneButton>
            <ToneButton tone="amber" onClick={() => setDialog('movement')}>
              <ArrowLeftRight size={16} /> Mouvement
            </ToneButton>
            <PrimaryButton onClick={() => setDialog('sale')}>
              <Plus size={16} /> Nouvelle vente
            </PrimaryButton>
          </div>
        }
      />

      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        <div className="space-y-6">
          <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
            <StatCard info="Somme des factures payées, tous moyens de paiement confondus." label="Encaissé" badge={{ label: CASH_PERIOD_LABELS[period], tone: 'sky' }} tone="green" value={formatMoney(totals.collected)} hint="Ventes réglées sur la période" />
            <StatCard info="Factures émises mais pas encore réglées." label="À encaisser" badge={{ label: 'À suivre', tone: 'amber' }} tone="amber" value={formatMoney(totals.pending)} hint="Factures en attente ou en retard" />
            <StatCard info="Ventes en espèces, plus les dépôts, moins les retraits et remboursements en espèces." label="Espèces en caisse" badge={{ label: 'Tiroir', tone: 'violet' }} value={formatMoney(totals.cashBalance)} hint="Ventes en espèces et mouvements" />
            <StatCard
              info="Remboursements et retraits enregistrés sur la période." label="Sorties"
              tone="red"
              value={formatMoney(totals.refunds + totals.withdrawals)}
              hint={`${formatMoney(totals.refunds)} remboursés, ${formatMoney(totals.withdrawals)} retirés`}
            />
          </div>

          {Object.keys(totals.byMethod).length > 0 && (
            <Card title="Encaissements par moyen de paiement">
              <ShareBars
                format={formatMoney}
                items={Object.entries(totals.byMethod)
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, v]) => ({ label: PAYMENT_METHOD_LABELS[m as PaymentMethod] ?? m, value: v }))}
              />
            </Card>
          )}

          <div className="no-print flex justify-end">
            <label className="relative block w-full max-w-sm">
              <span className="sr-only">Rechercher</span>
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client ou numéro de facture"
                className="w-full rounded-full border border-neutral-200 py-2.5 pl-10 pr-4 text-sm focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none"
              />
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Aucune opération" description="Aucune opération ne correspond à ces filtres." />
          ) : (
            <Table head={['Date', 'Type', 'Libellé', 'Moyen', 'Statut', <span key="m" className="block text-right">Montant</span>, '']}>
              {rows.map((e, index) => (
                <tr key={`${e.kind}-${e.id}`} className={`hover:bg-neutral-50 ${pager.rowClass(index)}`}>
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDateTime(e.date)}</td>
                  <td className="px-5 py-3">{LEDGER_TYPE_LABELS[e.type]}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-950">{e.label || '-'}</p>
                    {e.reference && <p className="text-xs text-neutral-400">{e.reference}</p>}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{paymentMethodLabel(e.method)}</td>
                  <td className="px-5 py-3">{e.status && <Badge tone={statusTone(INVOICE_STATUS_TONES, e.status)}>{INVOICE_STATUS_LABELS[e.status]}</Badge>}</td>
                  <td className={`whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums ${e.amount < 0 ? 'text-neutral-500' : 'text-neutral-950'}`}>
                    {e.amount < 0 ? `moins ${formatMoney(-e.amount)}` : formatMoney(e.amount)}
                  </td>
                  <td className="no-print px-5 py-3 text-right">
                    {e.invoice && (e.status === 'PENDING' || e.status === 'OVERDUE') && (
                      <button
                        type="button"
                        onClick={() => setCollecting(e.invoice!)}
                        className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                      >
                        Encaisser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <div className="no-print">
            <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="opérations" onChange={pager.setPage} />
          </div>
        </div>
      </QueryBoundary>

      {dialog === 'sale' && <SaleDialog onClose={() => setDialog(null)} onDone={query.refetch} />}
      {dialog === 'movement' && <MovementDialog onClose={() => setDialog(null)} onDone={query.refetch} />}
      {collecting && <CollectDialog invoice={collecting} onClose={() => setCollecting(null)} onDone={query.refetch} />}
    </div>
  );
}
