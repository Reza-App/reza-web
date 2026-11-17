'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, ExternalLink, Gift, Mail, Phone } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, StatCard, Table } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { type AccountDetail, PAYMENT_STATUS_LABELS, type SubscriptionChange, platformService } from '@/lib/api/services/platform.service';
import { subscriptionState } from '@/lib/billing';
import { formatDate, formatMoney, formatNumber, personName, toISODate } from '@/lib/format';
import { CLIENT_SITE_URL } from '@/lib/session';
import { PAYMENT_STATUS_TONES, statusTone } from '@/lib/status';
import { durationLabel, type Plan, PLAN_DURATIONS, PLAN_LABELS } from '@/lib/plans';

/** Extend, set the end date or the plan of an account's subscription. */
function SubscriptionDialog({ detail, onClose, onSaved }: { detail: AccountDetail; onClose: () => void; onSaved: (d: AccountDetail) => void }) {
  const toast = useToast();
  const sub = detail.subscription;
  const [mode, setMode] = useState<'extend' | 'setEnd' | 'plan'>('extend');
  const [months, setMonths] = useState('1');
  const [plan, setPlan] = useState<Plan>(sub?.plan ?? 'SALON');
  const [planMonths, setPlanMonths] = useState(String(sub?.periodMonths ?? 1));
  const [date, setDate] = useState(sub?.currentPeriodEnd ? toISODate(new Date(sub.currentPeriodEnd)) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (mode === 'setEnd' && !date) return setError('Choisissez une date de fin.');
    setBusy(true);
    setError(null);
    try {
      const change: SubscriptionChange =
        mode === 'extend'
          ? { action: 'extend', months: Number(months) }
          : mode === 'plan'
            ? { action: 'setPlan', plan, months: Number(planMonths) }
            : { action: 'setEnd', date: `${date}T12:00:00.000Z` };
      onSaved(await platformService.changeSubscription(detail.account.id, change));
      toast.success('Abonnement mis à jour. Le propriétaire a été prévenu.');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title="Modifier l'abonnement"
      onClose={onClose}
      busy={busy}
      error={error}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={save} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Fin actuelle : <span className="font-medium text-neutral-950">{formatDate(sub?.currentPeriodEnd) || 'aucune'}</span>. Le changement est
          appliqué sans virement (geste commercial, essai, partenaire).
        </p>
        <div className="flex rounded-full bg-neutral-100 p-1 text-sm" role="group" aria-label="Type de changement">
          {(
            [
              ['extend', 'Prolonger'],
              ['setEnd', 'Date de fin'],
              ['plan', 'Plan'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`flex-1 rounded-full px-3 py-2 transition ${mode === value ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'plan' ? (
          <div className="space-y-4">
            <FormField label="Plan" hint="S'applique au prochain paiement (renouvellement ou première période).">
              <Select
                value={plan}
                onValueChange={(v) => {
                  const next = v as Plan;
                  setPlan(next);
                  if (!PLAN_DURATIONS[next].includes(Number(planMonths))) setPlanMonths(String(PLAN_DURATIONS[next][0]));
                }}
                aria-label="Plan"
              >
                <option value="SALON">Salon</option>
                <option value="FREELANCE">Freelance</option>
              </Select>
            </FormField>
            <FormField label="Durée de la période">
              <Select value={planMonths} onValueChange={setPlanMonths} aria-label="Durée de la période">
                {PLAN_DURATIONS[plan].map((m) => (
                  <option key={m} value={String(m)}>
                    {durationLabel(m)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        ) : mode === 'extend' ? (
          <FormField label="Durée" hint="Ajoutée à la fin actuelle, ou à aujourd'hui si elle est passée.">
            <Select value={months} onValueChange={setMonths} aria-label="Durée">
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={String(m)}>
                  {m} mois
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="Nouvelle date de fin">
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        )}
      </div>
    </Modal>
  );
}

export default function PlatformAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = use(params);
  const toast = useToast();
  const query = useApiQuery(`platform-account:${accountId}`, (signal) => platformService.account(accountId, signal));
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const data = detail ?? query.data;
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'reactivate' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<AccountDetail>, message: string) => {
    setBusy(key);
    try {
      setDetail(await action());
      toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const sub = data?.subscription;
  const state = data
    ? subscriptionState({
        status: sub?.status ?? 'NONE',
        currentPeriodEnd: sub?.currentPeriodEnd,
        total: data.bill?.total ?? 0,
        renewalDue: data.bill?.renewalDue ?? false,
        pending: data.payments.some((p) => p.status === 'PENDING'),
        graceDays: data.graceDays,
      })
    : null;

  return (
    <div>
      <Link href="/plateforme/etablissements" className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950">
        <ArrowLeft size={16} /> Établissements
      </Link>
      <QueryBoundary loading={query.loading && !data} error={query.error} onRetry={query.refetch}>
        {data && state && (
          <div className="space-y-6">
            <PageHeader
              title={data.salons.map((s) => s.name).join(', ') || 'Compte sans salon'}
              description={`Compte de ${personName(data.owner) || 'propriétaire inconnu'}, inscrit le ${formatDate(data.account.createdAt)}.`}
              actions={
                <>
                  {sub && sub.status !== 'CANCELED' && (
                    <SecondaryButton onClick={() => setConfirm('cancel')} className="text-red-700">
                      Résilier
                    </SecondaryButton>
                  )}
                  {sub?.status === 'CANCELED' && <SecondaryButton onClick={() => setConfirm('reactivate')}>Réactiver</SecondaryButton>}
                  <PrimaryButton onClick={() => setEditing(true)}>
                    <CalendarPlus size={16} /> Modifier l&apos;abonnement
                  </PrimaryButton>
                </>
              }
            />

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 px-5 py-4">
              <Badge tone={state.tone}>{state.label}</Badge>
              <p className="text-sm text-neutral-700">
                {!sub || !sub.currentPeriodEnd
                  ? 'Aucune période payée : ses salons ne sont pas publiés.'
                  : `Période ${state.label === 'Expiré' || state.label === 'Période de grâce' ? 'terminée le' : "en cours jusqu'au"} ${formatDate(sub.currentPeriodEnd)}${
                      data.payments.some((p) => p.status === 'PENDING') ? ', un virement attend votre vérification' : ''
                    }.`}
              </p>
              {!data.account.isActive && <Badge tone="red">Compte désactivé</Badge>}
            </div>

            <div className="stagger stat-grid grid-cols-2 xl:grid-cols-4">
              <StatCard label="Plan" value={PLAN_LABELS[sub?.plan ?? 'SALON']} hint={durationLabel(sub?.periodMonths ?? 1)} />
              <StatCard label="Fin de période" value={formatDate(sub?.currentPeriodEnd) || '-'} />
              <StatCard label={data.bill?.renewalDue ? 'Prochaine période' : 'Reste à régler'} value={formatMoney(data.bill?.total ?? 0)} />
              <StatCard label="Encaissé au total" value={formatMoney(data.payments.filter((p) => p.status === 'APPROVED').reduce((t, p) => t + p.amount, 0))} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Card title="Salons">
                <Table head={['Salon', 'Collaborateurs', 'RDV', 'Clients', 'Inclus', 'Visibilité']}>
                  {data.salons.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-950">{s.name}</p>
                        <p className="text-xs text-neutral-500">
                          {s.city || 'Ville non renseignée'}
                          {s.slug && (
                            <a href={`${CLIENT_SITE_URL}/salon/${encodeURIComponent(s.slug)}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 whitespace-nowrap underline">
                              Fiche publique <ExternalLink size={11} />
                            </a>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {s.employees}
                        <span className="block text-xs text-neutral-500">{s.employeesPaid} payé{s.employeesPaid > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatNumber(s.appointments)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatNumber(s.clients)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={s.salonCovered}
                            disabled={busy === s.id}
                            label={`${s.name} inclus dans l'abonnement`}
                            onChange={(covered) =>
                              void run(s.id, () => platformService.setSalonCovered(s.id, covered), covered ? `${s.name} est inclus dans l'abonnement.` : `${s.name} n'est plus inclus.`)
                            }
                          />
                          <span className="whitespace-nowrap text-xs text-neutral-500">{s.salonCovered ? 'Oui' : 'Non'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={s.visible ? 'green' : 'amber'}>{s.visible ? 'Visible' : 'Masqué'}</Badge>
                      </td>
                    </tr>
                  ))}
                </Table>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                  <Gift size={13} /> Un salon est visible quand il est inclus dans un abonnement en cours ({data.salons.filter((s) => s.visible).length} sur{' '}
                  {data.salons.length}). Le cocher l&apos;inclut sans virement.
                </p>
              </Card>

              <Card title="Propriétaire">
                {data.owner ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-neutral-950">{personName(data.owner)}</p>
                    <a href={`mailto:${data.owner.email}`} className="flex items-center gap-2 text-neutral-700 hover:text-neutral-950">
                      <Mail size={14} /> {data.owner.email}
                    </a>
                    {data.owner.phone && (
                      <a href={`tel:${data.owner.phone}`} className="flex items-center gap-2 text-neutral-700 hover:text-neutral-950">
                        <Phone size={14} /> {data.owner.phone}
                      </a>
                    )}
                    <p className="text-xs text-neutral-500">Inscrit le {formatDate(data.owner.createdAt)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Aucun propriétaire.</p>
                )}
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Virements">
                {data.payments.length === 0 ? (
                  <p className="text-sm text-neutral-500">Aucun virement déclaré.</p>
                ) : (
                  <Table head={['Date', 'Montant', 'Titulaire', 'Statut']}>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-5 py-3">{formatDate(p.createdAt)}</td>
                        <td className="px-5 py-3 tabular-nums">{formatMoney(p.amount)}</td>
                        <td className="px-5 py-3">{p.payerName || '-'}</td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(PAYMENT_STATUS_TONES, p.status)}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                          {p.approvedBy && <p className="mt-1 text-xs text-neutral-500">par {personName(p.approvedBy)}</p>}
                          {p.rejectedReason && <p className="mt-1 text-xs text-red-700">{p.rejectedReason}</p>}
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
              <Card title="Factures Selia">
                {data.invoices.length === 0 ? (
                  <p className="text-sm text-neutral-500">Aucune facture.</p>
                ) : (
                  <Table head={['Numéro', 'Période', 'Montant']}>
                    {data.invoices.map((i) => (
                      <tr key={i.id}>
                        <td className="px-5 py-3 font-medium text-neutral-950">
                          <Link href={`/plateforme/factures/${encodeURIComponent(i.id)}`} className="hover:underline">
                            {i.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-neutral-600">{i.periodStart ? `${formatDate(i.periodStart)} au ${formatDate(i.periodEnd)}` : '-'}</td>
                        <td className="px-5 py-3 tabular-nums">{formatMoney(i.total)}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            </div>
          </div>
        )}
      </QueryBoundary>

      {editing && data && <SubscriptionDialog detail={data} onClose={() => setEditing(false)} onSaved={setDetail} />}
      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'cancel' ? "Résilier l'abonnement ?" : "Réactiver l'abonnement ?"}
        description={
          confirm === 'cancel'
            ? 'Tous les salons du compte seront masqués aux clients. Le propriétaire est prévenu. Vous pourrez réactiver plus tard.'
            : 'Les salons dont l’activation est réglée redeviennent visibles si la période est en cours.'
        }
        confirmLabel={confirm === 'cancel' ? 'Résilier' : 'Réactiver'}
        destructive={confirm === 'cancel'}
        busy={!!busy}
        onConfirm={() => data && void run('sub', () => platformService.changeSubscription(data.account.id, { action: confirm! }), confirm === 'cancel' ? 'Abonnement résilié.' : 'Abonnement réactivé.')}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
