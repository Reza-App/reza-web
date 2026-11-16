'use client';

import { Suspense, use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/page';
import { ScrollRow } from '@/components/client/ScrollRow';
import { fieldClass } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { EmptyState, LoadingState, QueryBoundary } from '@/components/ui/states';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { clientAccount, discovery, type SalonService } from '@/lib/api/services/clientArea.service';
import { durationLabel, groupServices, servicePrice } from '@/lib/clientSalon';
import { addDays, formatMoney, startOfDay, toISODate } from '@/lib/format';
import { CLIENT_LOGIN } from '@/lib/session';
import { isValidPhone, normalizePhone } from '@/lib/validation';

const ANY = '';
const DAYS_SHOWN = 21;

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-neutral-200 p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-medium text-neutral-950">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
          {done ? <Check size={14} /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Booking({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, client } = useClientAuth();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`${CLIENT_LOGIN}?next=${encodeURIComponent(`/client/salon/${id}/reserver`)}`);
  }, [status, router, id]);

  const salonQuery = useApiQuery(`client-salon:${id}`, (signal) => discovery.salon(id, signal));
  const salon = salonQuery.data;
  const tenantId = salon?.id;
  const servicesQuery = useApiQuery(tenantId ? `client-salon-services:${tenantId}` : null, (signal) => discovery.services(tenantId!, signal));
  const family = useApiQuery(status === 'authenticated' ? 'client-family' : null, (signal) => clientAccount.family(signal));

  const bookableServices = useMemo(() => (servicesQuery.data ?? []).filter((s) => s.visibility !== 'HIDDEN' && s.visibility !== 'VISIBLE'), [servicesQuery.data]);
  const [selected, setSelected] = useState<string[]>(() => (params.get('prestation') ? [params.get('prestation')!] : []));
  const [employees, setEmployees] = useState<Record<string, string>>({});
  const [forWhom, setForWhom] = useState<string>('me');
  const [date, setDate] = useState<string>(() => toISODate(startOfDay(new Date())));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const chosen: SalonService[] = selected.map((sid) => bookableServices.find((s) => s.id === sid)).filter((s): s is SalonService => !!s);
  const serviceEmployees = chosen.map((s) => ({ serviceId: s.id, employeeId: employees[s.id] || null }));
  const totalDuration = chosen.reduce((t, s) => t + s.duration, 0);
  const totalPrice = chosen.reduce((t, s) => t + (s.onQuote ? 0 : (s.priceType === 'RANGE' ? s.priceFrom : s.price) ?? 0), 0);
  // For me: my own appointments block their time; for a relative they do not.
  const slotsFor = forWhom === 'me' ? client?.email : undefined;
  const slotKey = tenantId && chosen.length ? `client-slots:${tenantId}:${date}:${JSON.stringify(serviceEmployees)}:${slotsFor ?? forWhom}` : null;
  const slots = useApiQuery(slotKey, () => discovery.slots(tenantId!, date, chosen.map((s) => s.id), serviceEmployees, slotsFor));

  // A new date or a new set of services invalidates the chosen time.
  const [lastSlotKey, setLastSlotKey] = useState(slotKey);
  if (lastSlotKey !== slotKey) {
    setLastSlotKey(slotKey);
    setTime(null);
  }

  const advance = Math.min(Math.max(salon?.settings?.bookingAdvanceDays ?? DAYS_SHOWN, 1), 90);
  const days = useMemo(() => Array.from({ length: Math.min(advance, DAYS_SHOWN * 2) }, (_, i) => addDays(startOfDay(new Date()), i)), [advance]);
  const proche = family.data?.find((m) => m.id === forWhom);
  const needsPhone = !client?.phone;

  const toggle = (sid: string) => setSelected((list) => (list.includes(sid) ? list.filter((x) => x !== sid) : [...list, sid]));

  const confirm = async () => {
    if (!client || !tenantId || !time || chosen.length === 0) return;
    const bookerPhone = normalizePhone(client.phone || phone);
    if (!isValidPhone(bookerPhone)) {
      setError('Indiquez un numéro de téléphone valide pour que le salon puisse vous joindre.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const startTime = `${date}T${time}:00`;
    const serviceIds = chosen.map((s) => s.id);
    try {
      await clientAccount.book({
        tenantId,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: bookerPhone,
        email: client.email,
        serviceIds,
        startTime,
        serviceEmployees,
        notes: notes.trim() || undefined,
        // For a relative: the client is the contact, the appointment is theirs.
        ...(proche
          ? {
              includeBooker: false,
              participants: [
                {
                  name: [proche.firstName, proche.lastName].filter(Boolean).join(' '),
                  phone: proche.phone ? normalizePhone(proche.phone) : undefined,
                  email: proche.email || undefined,
                  serviceIds,
                  serviceEmployees,
                  startTime,
                },
              ],
            }
          : {}),
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
      void slots.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  if (status !== 'authenticated') return <LoadingState />;

  if (done && salon) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-600" />
        <h1 className="mt-5 text-3xl font-medium text-neutral-950">Rendez vous réservé</h1>
        <p className="mt-3 text-neutral-600">
          {salon.name}, le {new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {time}
          {proche ? ` pour ${proche.firstName}` : ''}.
        </p>
        <p className="mt-2 text-sm text-neutral-500">Vous recevrez une notification dès que le salon l&apos;aura confirmé.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/client/rendez-vous" className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800">
            Voir mes rendez vous
          </Link>
          <Link href="/client" className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/client/salon/${encodeURIComponent(id)}`} className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950">
        <ArrowLeft size={16} /> {salon?.name ?? 'Salon'}
      </Link>
      <h1 className="mb-6 text-3xl font-medium text-neutral-950">Réserver</h1>
      <QueryBoundary loading={(salonQuery.loading && !salon) || (servicesQuery.loading && !servicesQuery.data)} error={salonQuery.error ?? servicesQuery.error} onRetry={salonQuery.refetch}>
        {bookableServices.length === 0 ? (
          <EmptyState title="Réservation en ligne indisponible" description="Ce salon ne propose pas encore de prestations réservables en ligne." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* min-w-0: the scrolling row of days must not widen the page. */}
            <div className="min-w-0 space-y-5">
              <Step n={1} title="Prestations" done={chosen.length > 0}>
                <div className="space-y-5">
                  {groupServices(bookableServices).map(([category, items]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{category}</p>
                      <ul className="space-y-2">
                        {items.map((s) => {
                          const on = selected.includes(s.id);
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => toggle(s.id)}
                                aria-pressed={on}
                                className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                              >
                                <span>
                                  <span className="block text-sm font-medium text-neutral-950">{s.name}</span>
                                  <span className="text-xs text-neutral-500">
                                    {durationLabel(s.duration)} · {servicePrice(s)}
                                  </span>
                                </span>
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300'}`}>
                                  {on && <Check size={14} />}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </Step>

              {chosen.length > 0 && (
                <Step n={2} title="Professionnel" done>
                  <div className="space-y-3">
                    {chosen.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-neutral-700">{s.name}</span>
                        <Select
                          className="w-full sm:w-72"
                          aria-label={`Professionnel pour ${s.name}`}
                          value={employees[s.id] ?? ANY}
                          onValueChange={(v) => setEmployees((m) => ({ ...m, [s.id]: v }))}
                        >
                          <option value={ANY}>Sans préférence</option>
                          {(s.employees ?? []).map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.firstName} {e.lastName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </Step>
              )}

              {chosen.length > 0 && (
                <Step n={3} title="Pour qui ?" done>
                  <div className="flex flex-wrap gap-2">
                    {[{ id: 'me', label: 'Moi' }, ...(family.data ?? []).map((m) => ({ id: m.id, label: `${m.firstName} (${m.relationship})` }))].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setForWhom(o.id)}
                        className={`rounded-full px-4 py-2 text-sm transition ${forWhom === o.id ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                    <Link href="/client/proches" className="rounded-full px-4 py-2 text-sm text-neutral-600 underline hover:text-neutral-950">
                      Gérer mes proches
                    </Link>
                  </div>
                </Step>
              )}

              {chosen.length > 0 && (
                <Step n={4} title="Date et heure" done={!!time}>
                  <ScrollRow label="Jours">
                    {days.map((d) => {
                      const iso = toISODate(d);
                      const on = iso === date;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setDate(iso)}
                          aria-pressed={on}
                          className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 text-sm transition ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 hover:border-neutral-400'}`}
                        >
                          <span className={`text-[11px] uppercase ${on ? 'text-white/70' : 'text-neutral-500'}`}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                          <span className="text-lg font-medium">{d.getDate()}</span>
                          <span className={`text-[11px] ${on ? 'text-white/70' : 'text-neutral-400'}`}>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
                        </button>
                      );
                    })}
                  </ScrollRow>
                  <div className="mt-4">
                    {slots.loading && !slots.data ? (
                      <p className="text-sm text-neutral-500">Recherche des créneaux...</p>
                    ) : slots.error ? (
                      <p className="text-sm text-red-700">{errorMessage(slots.error)}</p>
                    ) : (slots.data ?? []).length === 0 ? (
                      <p className="text-sm text-neutral-500">Aucun créneau disponible ce jour. Essayez une autre date.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {slots.data!.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTime(t)}
                            aria-pressed={time === t}
                            className={`rounded-full border py-2 text-sm tabular-nums transition ${time === t ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 hover:border-neutral-950'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Step>
              )}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <Card title="Récapitulatif">
                {chosen.length === 0 ? (
                  <p className="text-sm text-neutral-500">Choisissez une ou plusieurs prestations.</p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <ul className="space-y-2">
                      {chosen.map((s) => (
                        <li key={s.id} className="flex justify-between gap-3">
                          <span className="text-neutral-800">{s.name}</span>
                          <span className="shrink-0 text-neutral-600">{servicePrice(s)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-1 border-t border-neutral-100 pt-3 text-neutral-600">
                      <p>Durée : {durationLabel(totalDuration)}</p>
                      <p>Pour : {proche ? `${proche.firstName} ${proche.lastName ?? ''}` : 'moi'}</p>
                      {time && (
                        <p className="text-neutral-950">
                          {new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {time}
                        </p>
                      )}
                    </div>
                    <p className="flex justify-between border-t border-neutral-100 pt-3 font-medium text-neutral-950">
                      <span>Total estimé</span>
                      <span>{formatMoney(totalPrice)}</span>
                    </p>
                    {needsPhone && (
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Votre téléphone</span>
                        <input className={fieldClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                      </label>
                    )}
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Message au salon (facultatif)</span>
                      <textarea className={`${fieldClass} min-h-20`} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                    {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                    <button
                      type="button"
                      onClick={() => void confirm()}
                      disabled={!time || submitting}
                      className="w-full rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? 'Réservation...' : time ? 'Confirmer le rendez vous' : 'Choisissez un créneau'}
                    </button>
                  </div>
                )}
              </Card>
            </aside>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

export default function ClientBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingState />}>
      <Booking id={id} />
    </Suspense>
  );
}
