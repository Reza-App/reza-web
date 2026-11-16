'use client';

import { PAYMENT_STATUS_TONES, statusTone } from '@/lib/status';
import { useState } from 'react';
import { Copy, Landmark } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { type BankDetails, PAYMENT_STATUS_LABELS, subscriptionService } from '@/lib/api/services/subscription.service';
import { errorMessage } from '@/lib/api/errors';
import { subscriptionState } from '@/lib/billing';
import { formatDate, formatMoney } from '@/lib/format';

/** Bank account the virement goes to, with a copy button for the RIB. */
function BankBox({ bank, compact = false }: { bank: BankDetails; compact?: boolean }) {
  const toast = useToast();
  if (!bank.rib) {
    return <p className="text-sm text-neutral-500">Les coordonnées bancaires de Selia seront bientôt affichées ici. Contactez Selia pour les obtenir.</p>;
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bank.rib!.replace(/\s+/g, ''));
      toast.success('RIB copié.');
    } catch {
      toast.error('Copie impossible, sélectionnez le RIB à la main.');
    }
  };
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${compact ? '' : 'sm:grid-cols-2'}`}>
      {bank.accountHolder && (
        <div>
          <dt className="text-xs uppercase tracking-[0.08em] text-neutral-500">Bénéficiaire</dt>
          <dd className="mt-0.5 font-medium text-neutral-950">{bank.accountHolder}</dd>
        </div>
      )}
      {bank.name && (
        <div>
          <dt className="text-xs uppercase tracking-[0.08em] text-neutral-500">Banque</dt>
          <dd className="mt-0.5 text-neutral-950">{bank.name}</dd>
        </div>
      )}
      <div className={compact ? '' : 'sm:col-span-2'}>
        <dt className="text-xs uppercase tracking-[0.08em] text-neutral-500">RIB</dt>
        <dd className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[15px] tracking-wide text-neutral-950">{bank.rib}</span>
          <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50">
            <Copy size={12} /> Copier
          </button>
        </dd>
      </div>
      {bank.swift && (
        <div>
          <dt className="text-xs uppercase tracking-[0.08em] text-neutral-500">SWIFT</dt>
          <dd className="mt-0.5 font-mono text-neutral-950">{bank.swift}</dd>
        </div>
      )}
      {bank.note && <p className={`text-neutral-600 ${compact ? '' : 'sm:col-span-2'}`}>{bank.note}</p>}
    </dl>
  );
}

function TransferDialog({ amount, bank, onClose, onDone }: { amount: number; bank: BankDetails; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reference, setReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!payerName.trim()) return setError('Indiquez le nom du titulaire du compte qui a fait le virement.');
    setBusy(true);
    setError(null);
    try {
      // The amount is the bill's: the server refuses any other amount.
      await subscriptionService.declareTransfer({ amount, reference: reference.trim() || undefined, payerName: payerName.trim() });
      toast.success('Virement déclaré. Selia le valide dès réception sur son compte.');
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
      error={error}
      open
      title="Déclarer un virement"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            J&apos;ai fait le virement
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-neutral-50 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">Montant à virer</p>
          <p className="mt-1 text-3xl font-medium tabular-nums text-neutral-950">{formatMoney(amount)}</p>
        </div>
        <BankBox bank={bank} compact />
        <FormField label="Titulaire du compte émetteur">
          <input className={fieldClass} maxLength={200} value={payerName} onChange={(e) => setPayerName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Référence du virement (facultatif)" hint="Elle aide Selia à retrouver votre virement plus vite.">
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
  const data = overview.data;
  const bill = data?.bill;
  const sub = data?.subscription;
  const pending = !!payments.data?.some((p) => p.status === 'PENDING');
  const state =
    bill && sub
      ? subscriptionState({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, total: bill.total, renewalDue: bill.renewalDue, pending, graceDays: data.graceDays })
      : null;
  const blocked = !bill ? 'Chargement...' : pending ? 'Un virement est déjà en vérification.' : bill.total <= 0 ? 'Rien à régler pour le moment.' : null;
  const tiers = bill?.config.employeeTiers ?? null;

  return (
    <div>
      <PageHeader
        title="Abonnement et paiement"
        description="Votre abonnement Selia se règle par virement bancaire. Une fois le virement fait, déclarez le ici : Selia le valide dès réception."
        actions={
          <PrimaryButton onClick={() => setDeclaring(true)} disabled={!!blocked} title={blocked ?? undefined}>
            <Landmark size={16} /> Déclarer un virement
          </PrimaryButton>
        }
      />
      <QueryBoundary loading={overview.loading && !overview.data} error={overview.error} onRetry={overview.refetch}>
        {bill && sub && state && data && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 px-5 py-4">
              <Badge tone={state.tone}>{state.label}</Badge>
              <p className="text-sm text-neutral-700">{state.message}</p>
            </div>

            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard info="État de votre abonnement Selia." label="Statut" value={state.label} hint={pending ? 'Virement en vérification' : undefined} />
              <StatCard
                info={bill.renewalDue ? 'Montant de la prochaine période.' : 'Montant restant à régler pour la période en cours.'}
                label={bill.renewalDue ? 'Prochaine période' : 'À régler'}
                value={formatMoney(bill.total)}
              />
              <StatCard info="Date de fin de la période payée." label="Fin de période" value={formatDate(sub.currentPeriodEnd) || '-'} />
              <StatCard info="Collaborateurs actifs de vos salons." label="Collaborateurs" value={bill.employeeCount} hint={`${bill.config.freeEmployeeThreshold} inclus par salon`} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Card title={bill.renewalDue ? 'Détail de la prochaine période' : 'Détail à régler'}>
                <Table head={['Salon', 'Collaborateurs', "Frais d'activation", 'Collaborateurs (mois)', 'Total']}>
                  {bill.salons.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-950">{s.name}</p>
                        <p className="text-xs text-neutral-500">{s.subscriptionActive ? 'Visible par les clients' : 'Masqué aux clients'}</p>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{s.employeeCount}</td>
                      <td className="px-5 py-3 tabular-nums">{s.salonCovered ? <span className="text-neutral-500">Réglés</span> : formatMoney(s.salonFee)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatMoney(s.employeeFee)}</td>
                      <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(s.total)}</td>
                    </tr>
                  ))}
                </Table>
                <div className="mt-4 space-y-1.5 text-xs text-neutral-500">
                  <p>Frais d&apos;activation : {formatMoney(bill.config.pricePerSalon)} par salon, payés une seule fois.</p>
                  <p>
                    Collaborateurs : {bill.config.freeEmployeeThreshold} inclus par salon, puis par mois et par collaborateur{' '}
                    {tiers?.length
                      ? tiers.map((t) => `${formatMoney(t.price)} (${t.max === null ? `${t.min} et plus` : t.min === t.max ? `${t.min}` : `${t.min} à ${t.max}`})`).join(', ')
                      : formatMoney(bill.config.pricePerEmployee)}
                    .
                  </p>
                  <p>Après la fin d&apos;une période, vos salons restent visibles {data.graceDays} jours avant d&apos;être masqués.</p>
                </div>
              </Card>
              <Card title="Où faire le virement">
                <BankBox bank={data.bank} />
              </Card>
            </div>

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
                        {p.status === 'APPROVED' && p.approvedAt && <p className="mt-1 text-xs text-neutral-500">le {formatDate(p.approvedAt)}</p>}
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
      {declaring && bill && data && (
        <TransferDialog
          amount={bill.total}
          bank={data.bank}
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
