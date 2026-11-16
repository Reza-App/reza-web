'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ToneButton } from '@/components/ui/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, PageHeader, Pagination, SegmentedControl, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { errorMessage } from '@/lib/api/errors';
import { PAYMENT_STATUS_LABELS, type PaymentStatus, type PlatformPayment, platformService } from '@/lib/api/services/platform.service';
import { formatDate, formatDateTime, formatMoney, personName } from '@/lib/format';
import { PAYMENT_STATUS_TONES, statusTone } from '@/lib/status';

const FILTERS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'À vérifier' },
  { value: 'APPROVED', label: 'Validés' },
  { value: 'REJECTED', label: 'Refusés' },
  { value: 'ALL', label: 'Tous' },
];

export default function PlatformPaymentsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<PaymentStatus | 'ALL'>('PENDING');
  const query = useApiQuery(`platform-payments:${filter}`, (signal) => platformService.payments(filter === 'ALL' ? undefined : filter, signal));
  const payments = query.data?.payments ?? [];
  const pager = usePagination(payments, 15, filter);

  const [approving, setApproving] = useState<PlatformPayment | null>(null);
  const [rejecting, setRejecting] = useState<PlatformPayment | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      setApproving(null);
      setRejecting(null);
      setReason('');
      await query.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Paiements d'abonnement"
        description="Virements déclarés par les établissements. Vérifiez la réception sur le compte avant de valider : la validation publie les salons payés, prolonge l'abonnement et émet la facture."
      />

      <div className="mb-5">
        <SegmentedControl label="Statut des paiements" value={filter} options={FILTERS} onChange={setFilter} />
      </div>

      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {payments.length === 0 ? (
          <EmptyState
            title={filter === 'PENDING' ? 'Aucun paiement à vérifier' : 'Aucun paiement'}
            description={filter === 'PENDING' ? 'Les virements déclarés par les établissements apparaîtront ici.' : undefined}
          />
        ) : (
          <Table head={['Déclaré le', 'Compte', 'Établissements', 'Montant', 'Référence', 'Statut', '']}>
            {pager.pageItems.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDateTime(p.createdAt)}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-neutral-950">{personName(p.account?.owner) || '-'}</p>
                  <p className="text-xs text-neutral-500">{p.account?.owner?.email}</p>
                </td>
                <td className="px-5 py-3 text-neutral-700">
                  {/* What this payment covers, as declared (not every salon of the account). */}
                  {p.details?.salons?.length ? (
                    <ul className="space-y-1">
                      {p.details.salons.map((s) => (
                        <li key={s.id}>
                          <span className="font-medium text-neutral-900">{s.name}</span>
                          <span className="block text-xs text-neutral-500">
                            {[
                              s.salonFee > 0 && `activation ${formatMoney(s.salonFee)}`,
                              s.employeeFee > 0 && `${s.billableEmployees} collaborateur${s.billableEmployees > 1 ? 's' : ''} ${formatMoney(s.employeeFee)}`,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'rien à régler'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    p.account?.salons.map((s) => s.name).join(', ') || '-'
                  )}
                  {p.details?.renewal && <Badge tone="sky">Renouvellement</Badge>}
                </td>
                <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums">{formatMoney(p.amount)}</td>
                <td className="px-5 py-3">
                  <p className="text-neutral-800">{p.reference || '-'}</p>
                  {p.payerName && <p className="text-xs text-neutral-500">Payé par {p.payerName}</p>}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone(PAYMENT_STATUS_TONES, p.status)}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                  {p.status === 'APPROVED' && p.approvedAt && <p className="mt-1 text-xs text-neutral-500">le {formatDate(p.approvedAt)}</p>}
                  {p.status === 'REJECTED' && p.rejectedReason && <p className="mt-1 max-w-48 text-xs text-neutral-500">{p.rejectedReason}</p>}
                </td>
                <td className="px-5 py-3">
                  {p.status === 'APPROVED' && p.hasInvoice === false && (
                    <div className="flex justify-end">
                      <ToneButton tone="neutral" disabled={busy} onClick={() => void run(() => platformService.issueInvoice(p.id), 'Facture émise.')}>
                        Émettre la facture
                      </ToneButton>
                    </div>
                  )}
                  {p.status === 'PENDING' && (
                    <div className="flex justify-end gap-2">
                      <ToneButton tone="red" onClick={() => setRejecting(p)}>
                        <X size={15} /> Refuser
                      </ToneButton>
                      <ToneButton tone="green" onClick={() => setApproving(p)}>
                        <Check size={15} /> Valider
                      </ToneButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} label="paiements" onChange={pager.setPage} />
      </QueryBoundary>

      <ConfirmDialog
        open={!!approving}
        title="Valider ce paiement ?"
        description={
          approving
            ? `${formatMoney(approving.amount)} de ${personName(approving.account?.owner)}. Les salons payés seront publiés, l'abonnement prolongé, la facture émise et le propriétaire notifié.`
            : ''
        }
        confirmLabel="Valider le paiement"
        busy={busy}
        onConfirm={() => approving && void run(() => platformService.approvePayment(approving.id), 'Paiement validé.')}
        onCancel={() => setApproving(null)}
      />

      <Modal
        open={!!rejecting}
        title="Refuser le paiement"
        size="sm"
        busy={busy}
        onClose={() => {
          setRejecting(null);
          setReason('');
        }}
        footer={
          <>
            <SecondaryButton onClick={() => setRejecting(null)} disabled={busy}>
              Annuler
            </SecondaryButton>
            <PrimaryButton busy={busy} onClick={() => rejecting && void run(() => platformService.rejectPayment(rejecting.id, reason.trim() || undefined), 'Paiement refusé.')}>
              Refuser le paiement
            </PrimaryButton>
          </>
        }
      >
        <p className="mb-4 text-sm text-neutral-600">
          {rejecting && `${formatMoney(rejecting.amount)} déclaré par ${personName(rejecting.account?.owner)}. Le propriétaire verra le motif.`}
        </p>
        <FormField label="Motif (facultatif)" hint="Par exemple : virement introuvable, montant incorrect.">
          <textarea className={`${fieldClass} min-h-24`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </Modal>
    </div>
  );
}
