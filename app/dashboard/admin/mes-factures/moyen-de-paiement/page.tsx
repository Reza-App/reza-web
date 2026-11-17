'use client';

import { PAYMENT_STATUS_TONES, statusTone } from '@/lib/status';
import { useState } from 'react';
import { Check, Copy, Landmark } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { type BankDetails, PAYMENT_STATUS_LABELS, type SubscriptionBill, subscriptionService } from '@/lib/api/services/subscription.service';
import { errorMessage } from '@/lib/api/errors';
import { subscriptionState } from '@/lib/billing';
import { formatDate, formatMoney } from '@/lib/format';
import {
  discountsLine,
  durationLabel,
  freelanceGrid,
  type Plan,
  PLAN_DURATIONS,
  PLAN_LABELS,
  PLAN_PITCH,
  type PlanQuote,
  salonGrid,
} from '@/lib/plans';

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

function TransferDialog({
  amount,
  bank,
  choice,
  onClose,
  onDone,
}: {
  amount: number;
  bank: BankDetails;
  choice: { plan: Plan; months: number; label: string };
  onClose: () => void;
  onDone: () => void;
}) {
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
      await subscriptionService.declareTransfer({ amount, reference: reference.trim() || undefined, payerName: payerName.trim(), plan: choice.plan, months: choice.months });
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
          <p className="mt-1 text-sm text-neutral-600">{choice.label}</p>
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

/** Total of the choice and the pay button, right under the choice (no scrolling back up). */
function PayBar({ total, label, blocked, onPay }: { total: number; label: string; blocked: string | null; onPay: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-neutral-950 px-5 py-4 text-white">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-white/60">Total à régler</p>
        <p className="mt-0.5 text-2xl font-medium tabular-nums">{formatMoney(total)}</p>
        <p className="truncate text-sm text-white/70">{blocked && total > 0 ? blocked : label}</p>
      </div>
      <button
        type="button"
        onClick={onPay}
        disabled={!!blocked}
        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Landmark size={16} /> Payer par virement
      </button>
    </div>
  );
}

/**
 * Change of plan during a paid period: the running plan stays until its end
 * (it prices the collaborators added meanwhile), the choice applies at the
 * next payment.
 */
function NextPlan({ bill, pricingText, onSaved }: { bill: SubscriptionBill; pricingText: Record<Plan, string>; onSaved: () => void }) {
  const toast = useToast();
  const scheduled = { plan: bill.nextPlan ?? bill.currentPlan, months: bill.nextMonths ?? bill.currentMonths };
  const [pick, setPick] = useState(scheduled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = pick.plan !== scheduled.plan || pick.months !== scheduled.months;
  const quote = bill.quotes.find((q) => q.plan === pick.plan && q.months === pick.months);
  const isNext = !!bill.nextPlan && (bill.nextPlan !== bill.currentPlan || bill.nextMonths !== bill.currentMonths);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await subscriptionService.setPlan(pick.plan, pick.months);
      toast.success(`Plan ${PLAN_LABELS[pick.plan]}, ${durationLabel(pick.months)} : appliqué au renouvellement du ${formatDate(bill.currentPeriodEnd)}.`);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-4 border-t border-neutral-100 pt-6">
      <div>
        <p className="text-sm font-medium text-neutral-950">Changer de plan</p>
        <p className="mt-1 text-sm text-neutral-500">
          Prix pour votre équipe actuelle. Votre plan en cours reste valable jusqu&apos;au {formatDate(bill.currentPeriodEnd)} ; le nouveau s&apos;applique à partir du
          renouvellement.
        </p>
      </div>
      {isNext && (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Au renouvellement : plan <span className="font-medium">{PLAN_LABELS[bill.nextPlan!]}</span>, {durationLabel(bill.nextMonths!)}.
        </p>
      )}
      <PlanPicker quotes={bill.quotes} plan={pick.plan} months={pick.months} onChange={(plan, months) => setPick({ plan, months })} pricingText={pricingText} />
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {changed && (
          <SecondaryButton onClick={() => setPick(scheduled)} disabled={busy}>
            Annuler
          </SecondaryButton>
        )}
        <PrimaryButton onClick={() => void save()} busy={busy} disabled={!changed}>
          {changed && quote ? `Changer pour ce plan (${formatMoney(quote.total)} au renouvellement)` : 'Changer pour ce plan'}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Plan and period choice, with the price of each option for this account. */
function PlanPicker({
  quotes,
  plan,
  months,
  onChange,
  pricingText,
  readOnly = false,
}: {
  quotes: PlanQuote[];
  plan: Plan;
  months: number;
  onChange: (plan: Plan, months: number) => void;
  pricingText: Record<Plan, string>;
  /** Shows the offer without letting it be picked (running period). */
  readOnly?: boolean;
}) {
  const quoteOf = (p: Plan, m: number) => quotes.find((q) => q.plan === p && q.months === m);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
        {(['SALON', 'FREELANCE'] as Plan[]).map((p) => {
          const available = quotes.some((q) => q.plan === p);
          const on = plan === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!available || readOnly}
              onClick={() => onChange(p, PLAN_DURATIONS[p].includes(months) ? months : PLAN_DURATIONS[p][0]!)}
              className={`rounded-2xl border p-5 text-left transition disabled:cursor-default ${!available ? 'opacity-50' : ''} ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 enabled:hover:border-neutral-400'}`}
            >
              <span className="flex items-center justify-between">
                <span className="text-lg font-medium">Plan {PLAN_LABELS[p]}</span>
                {on && <Check size={18} />}
              </span>
              <span className={`mt-1 block text-sm ${on ? 'text-white/75' : 'text-neutral-500'}`}>{PLAN_PITCH[p]}</span>
              <span className={`mt-3 block text-xs ${on ? 'text-white/70' : 'text-neutral-500'}`}>
                {available ? pricingText[p] : 'Réservé à une seule personne : votre équipe compte plusieurs collaborateurs.'}
              </span>
            </button>
          );
        })}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Durée</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Durée">
          {PLAN_DURATIONS[plan].map((m) => {
            const q = quoteOf(plan, m);
            if (!q) return null;
            const on = months === m;
            // Discount compared with paying month by month.
            const discount = q.savings > 0 ? Math.round((q.savings / (q.total + q.savings)) * 100) : 0;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => onChange(plan, m)}
                className={`relative flex h-full flex-col rounded-2xl border p-4 text-left transition disabled:cursor-default ${
                  // Every card has the selected look; the chosen one gets a thicker edge and a ticked circle.
                  on ? 'border-neutral-950 bg-neutral-50 shadow-[0_0_0_1px_#0a0a0a]' : 'border-neutral-950 bg-neutral-50 enabled:hover:shadow-[0_0_0_1px_#0a0a0a]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-neutral-950">
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300'}`}
                    >
                      {on && <Check size={10} strokeWidth={3} />}
                    </span>
                    {durationLabel(m)}
                  </span>
                  {discount > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">-{discount} %</span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">Flexible</span>
                  )}
                </span>
                <span className="mt-4 block text-2xl font-medium tabular-nums tracking-tight text-neutral-950">{formatMoney(q.total)}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {m > 1 ? `soit ${formatMoney(Math.round(q.perMonth))} par mois` : 'par mois'}
                </span>
                <span className={`mt-auto block border-t border-neutral-100 pt-3 text-xs ${q.savings > 0 ? 'font-medium text-emerald-700' : 'text-neutral-400'}`} style={{ marginTop: 16 }}>
                  {q.savings > 0 ? `${formatMoney(q.savings)} économisés` : 'Sans engagement'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPaymentPage() {
  // null: the subscription's own plan; set when the owner picks another option.
  const [choice, setChoice] = useState<{ plan: Plan; months: number } | null>(null);
  const overview = useApiQuery(`subscription:${choice?.plan ?? ''}:${choice?.months ?? ''}`, (signal) => subscriptionService.overview(choice ?? {}, signal));
  const payments = useApiQuery('subscription-payments', (signal) => subscriptionService.payments(signal));
  const [declaring, setDeclaring] = useState(false);
  const data = overview.data;
  const bill = data?.bill;
  const sub = data?.subscription;
  const topUp = bill?.mode === 'topup';
  const pricing = bill?.config.pricing;
  const pricingText = pricing ? { SALON: `${salonGrid(pricing)}. ${discountsLine(pricing)}`, FREELANCE: freelanceGrid(pricing) } : { SALON: '', FREELANCE: '' };
  const choiceLabel = bill
    ? topUp
      ? `Plan ${PLAN_LABELS[bill.plan]}, ajout sur la période en cours (jusqu'au ${formatDate(bill.currentPeriodEnd)})`
      : `Plan ${PLAN_LABELS[bill.plan]}, ${durationLabel(bill.months)}`
    : '';
  const pending = !!payments.data?.some((p) => p.status === 'PENDING');
  const state =
    bill && sub
      ? subscriptionState({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, total: bill.total, renewalDue: bill.renewalDue, pending, graceDays: data.graceDays })
      : null;
  const blocked = !bill
    ? 'Chargement...'
    : pending
      ? 'Un virement est déjà en vérification.'
      : bill.planIssue
        ? bill.planIssue
        : bill.total <= 0
          ? 'Rien à régler pour le moment.'
          : null;

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
              <StatCard
                info="Plan et durée de votre abonnement."
                label="Plan actuel"
                value={`${PLAN_LABELS[sub.plan]}`}
                hint={`${durationLabel(sub.periodMonths)}, ${bill.employeeCount} collaborateur${bill.employeeCount > 1 ? 's' : ''}`}
              />
            </div>

            <Card title={topUp ? 'Votre formule' : bill.renewalDue ? 'Formule de la prochaine période' : 'Choisissez votre formule'}>
              {topUp ? (
                <div className="space-y-4 text-sm text-neutral-700">
                  <p>
                    Plan <span className="font-medium text-neutral-950">{PLAN_LABELS[bill.currentPlan]}</span>, payé par périodes de {durationLabel(bill.currentMonths)}. Période en cours
                    jusqu&apos;au <span className="font-medium text-neutral-950">{formatDate(bill.currentPeriodEnd)}</span> (environ{' '}
                    {bill.remainingMonths.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois restants).
                  </p>
                  {bill.total > 0 ? (
                    <div className="space-y-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-950">
                      <p className="font-medium">Pourquoi {formatMoney(bill.total)} à régler ?</p>
                      {bill.salons
                        .filter((s) => s.total > 0)
                        .map((s) => (
                          <p key={s.id}>
                            {s.name} : {s.employeeCount} collaborateurs actifs, {s.employeesPaid} couverts par votre paiement. {s.addedCollaborators > 0 ? `Les ${s.addedCollaborators} ajoutés` : 'Le changement'} coûtent{' '}
                            {formatMoney(s.monthlyDifference)} de plus par mois, pour les {bill.remainingMonths.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois restants :{' '}
                            <span className="font-medium">{formatMoney(s.total)}</span>.
                          </p>
                        ))}
                      <p className="text-amber-900/80">Sans ce règlement, seuls les collaborateurs couverts restent réservables en ligne.</p>
                    </div>
                  ) : null}
                  {bill.total > 0 ? (
                    <PayBar total={bill.total} label={choiceLabel} blocked={blocked} onPay={() => setDeclaring(true)} />
                  ) : (
                    <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">Tous vos collaborateurs sont couverts jusqu&apos;à la fin de la période. Rien à régler.</p>
                  )}
                  {bill.currentPlan === 'FREELANCE' && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                      <p className="flex-1 text-neutral-700">
                        {bill.plan === 'SALON' ? 'Passage au plan Salon : la différence est calculée pour les jours restants.' : 'Votre équipe grandit ? Passez au plan Salon.'}
                      </p>
                      <SecondaryButton onClick={() => setChoice(bill.plan === 'SALON' ? null : { plan: 'SALON', months: bill.currentMonths })}>
                        {bill.plan === 'SALON' ? 'Rester en Freelance' : 'Passer au plan Salon'}
                      </SecondaryButton>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <PlanPicker quotes={bill.quotes} plan={bill.plan} months={bill.months} onChange={(plan, months) => setChoice({ plan, months })} pricingText={pricingText} />
                  {bill.planIssue && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{bill.planIssue}</p>}
                  <PayBar total={bill.total} label={choiceLabel} blocked={blocked} onPay={() => setDeclaring(true)} />
                </>
              )}
              {topUp && (
                <NextPlan bill={bill} pricingText={pricingText} onSaved={() => void overview.refetch()} />
              )}
              {topUp && bill.planIssue && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{bill.planIssue}</p>}
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Card title={topUp ? 'Détail à régler' : `Détail : ${choiceLabel}`}>
                <Table head={['Salon', 'Collaborateurs actifs', topUp ? 'Déjà couverts' : 'Facturés', 'Montant']}>
                  {bill.salons.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-950">{s.name}</p>
                        <p className="text-xs text-neutral-500">{s.subscriptionActive ? 'Visible par les clients' : 'Masqué aux clients'}</p>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{s.employeeCount}</td>
                      <td className="px-5 py-3 tabular-nums">{topUp ? s.employeesPaid : s.billableEmployees || '-'}</td>
                      <td className="px-5 py-3 font-medium tabular-nums">{formatMoney(s.total)}</td>
                    </tr>
                  ))}
                </Table>
                <p className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm font-medium text-neutral-950">
                  <span>Total {topUp ? 'à régler' : choiceLabel ? `(${durationLabel(bill.months)})` : ''}</span>
                  <span className="tabular-nums">{formatMoney(bill.total)}</span>
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-neutral-500">
                  <p>Plan Salon : {pricingText.SALON}</p>
                  <p>Plan Freelance : {pricingText.FREELANCE} Toutes les fonctionnalités sont incluses dans les deux plans.</p>
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
          choice={{ plan: bill.plan, months: bill.months, label: choiceLabel }}
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
