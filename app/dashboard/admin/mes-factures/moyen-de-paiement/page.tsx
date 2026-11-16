'use client';

import { PAYMENT_STATUS_TONES, statusTone } from '@/lib/status';
import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import {
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  subscriptionService,
} from '@/lib/api/services/subscription.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatMoney } from '@/lib/format';

function TransferDialog({ amount, onClose, onDone }: { amount: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState(String(amount || ''));
  const [reference, setReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return setError('Montant invalide.');
    if (!payerName.trim()) return setError('Indiquez le nom du titulaire du compte émetteur.');
    setBusy(true);
    try {
      await subscriptionService.declareTransfer({ amount: n, reference: reference.trim() || undefined, payerName: payerName.trim() });
      toast.success('Virement déclaré. Il sera validé par Selia dès réception.');
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title="Déclarer un virement"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Déclarer
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <FormField label="Montant viré (DH)">
          <input className={fieldClass} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </FormField>
        <FormField label="Titulaire du compte émetteur">
          <input className={fieldClass} maxLength={200} value={payerName} onChange={(e) => setPayerName(e.target.value)} />
        </FormField>
        <FormField label="Référence du virement (facultatif)">
          <input className={fieldClass} maxLength={200} value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function SubscriptionPaymentPage() {
  const overview = useApiQuery('subscription', (signal) => subscriptionService.overview(signal));
  const payments = useApiQuery('subscription-payments', (signal) => subscriptionService.payments(signal));
  const [declaring, setDeclaring] = useState(false);
  const bill = overview.data?.bill;
  const sub = overview.data?.subscription;
  const pending = payments.data?.some((p) => p.status === 'PENDING');

  return (
    <div>
      <PageHeader
        title="Abonnement et paiement"
        description="Votre abonnement Selia se règle par virement bancaire. Une fois le virement effectué, déclarez le ici pour qu'il soit validé."
        actions={
          <PrimaryButton onClick={() => setDeclaring(true)} disabled={!bill}>
            <Landmark size={16} /> Déclarer un virement
          </PrimaryButton>
        }
      />
      <QueryBoundary loading={overview.loading && !overview.data} error={overview.error} onRetry={overview.refetch}>
        {bill && sub && (
          <div className="space-y-6">
            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="État de votre abonnement Selia." label="Statut" value={SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status} hint={pending ? 'Un virement est en vérification' : undefined} />
              <StatCard info="Montant de votre abonnement Selia pour la période en cours." label="Montant de la période" badge={{ label: 'TTC', tone: 'green' }} tone="green" value={formatMoney(bill.total)} />
              <StatCard info="Date de fin de la période d’abonnement en cours." label="Échéance" badge={{ label: 'Prochaine', tone: 'amber' }} value={formatDate(sub.currentPeriodEnd) || '-'} />
              <StatCard info="Collaborateurs facturés dans votre abonnement." label="Collaborateurs" value={bill.employeeCount} hint={`${bill.config.freeEmployeeThreshold} inclus par salon`} />
            </div>
            <Card title="Détail de la facturation">
              <Table head={['Salon', 'Collaborateurs', 'Abonnement salon', 'Collaborateurs supplémentaires', 'Total']}>
                {bill.salons.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 font-medium text-neutral-950">{s.name}</td>
                    <td className="px-5 py-3 tabular-nums">{s.employeeCount}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(s.salonFee)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(s.employeeFee)}</td>
                    <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(s.total)}</td>
                  </tr>
                ))}
              </Table>
              <p className="mt-4 text-xs text-neutral-500">
                {formatMoney(bill.config.pricePerSalon)} par salon, puis {formatMoney(bill.config.pricePerEmployee)} par collaborateur au delà de{' '}
                {bill.config.freeEmployeeThreshold}.
              </p>
            </Card>
            <Card title="Virements déclarés">
              {payments.data && payments.data.length > 0 ? (
                <Table head={['Date', 'Montant', 'Titulaire', 'Référence', 'Statut']}>
                  {payments.data.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3">{formatDate(p.createdAt)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatMoney(p.amount)}</td>
                      <td className="px-5 py-3">{p.payerName}</td>
                      <td className="px-5 py-3 text-neutral-500">{p.reference}</td>
                      <td className="px-5 py-3">
                        <Badge tone={statusTone(PAYMENT_STATUS_TONES, p.status)}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                        {p.rejectedReason && <p className="mt-1 text-xs text-red-700">{p.rejectedReason}</p>}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-sm text-neutral-500">Aucun virement déclaré.</p>
              )}
            </Card>
          </div>
        )}
      </QueryBoundary>
      {declaring && bill && (
        <TransferDialog
          amount={bill.total}
          onClose={() => setDeclaring(false)}
          onDone={() => {
            void payments.refetch();
            void overview.refetch();
          }}
        />
      )}
    </div>
  );
}
