'use client';

import { Suspense, use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Copy, Plus, UserRound, X } from 'lucide-react';
import { Card } from '@/components/ui/page';
import { ScrollRow } from '@/components/client/ScrollRow';
import { fieldClass } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { EmptyState, LoadingState, QueryBoundary } from '@/components/ui/states';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { clientAccount, discovery, type FamilyMember, type SalonService } from '@/lib/api/services/clientArea.service';
import { durationLabel, groupServices, isClosedOn, openingHours, servicePrice } from '@/lib/clientSalon';
import { addDays, formatMoney, startOfDay, toISODate } from '@/lib/format';
import { type BookingPerson, buildBooking, fullName, groupReady, mapLimit, MAX_GROUP, slotRequest, slotsByPeriod } from '@/lib/groupBooking';
import { CLIENT_LOGIN } from '@/lib/session';
import { isValidPhone, normalizePhone } from '@/lib/validation';

const ANY = '';
const DAYS_SHOWN = 21;
const RELATIONSHIPS = ['Enfant', 'Conjoint(e)', 'Parent', 'Frère / sœur', 'Ami(e)', 'Autre'];

const priceOf = (s: SalonService) => (s.onQuote ? 0 : ((s.priceType === 'RANGE' ? s.priceFrom : s.price) ?? 0));

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

const chip = (on: boolean) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${on ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`;

type GuestDraft = { firstName: string; lastName: string; phone: string; save: boolean; relationship: string };
const EMPTY_GUEST: GuestDraft = { firstName: '', lastName: '', phone: '', save: true, relationship: 'Ami(e)' };

/** Inline form to add someone who is not in the saved relatives yet. */
function GuestForm({ onAdd, onCancel }: { onAdd: (g: GuestDraft) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<GuestDraft>(EMPTY_GUEST);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: 'firstName' | 'lastName' | 'phone') => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const submit = async () => {
    if (!draft.firstName.trim()) return setError('Indiquez au moins le prénom.');
    if (draft.phone.trim() && !isValidPhone(normalizePhone(draft.phone))) return setError('Téléphone invalide : +212XXXXXXXXX ou 0XXXXXXXXX.');
    setBusy(true);
    setError(null);
    try {
      await onAdd(draft);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={fieldClass} placeholder="Prénom" value={draft.firstName} onChange={set('firstName')} aria-label="Prénom" autoFocus />
        <input className={fieldClass} placeholder="Nom" value={draft.lastName} onChange={set('lastName')} aria-label="Nom" />
        <input className={fieldClass} type="tel" placeholder="Téléphone (facultatif)" value={draft.phone} onChange={set('phone')} aria-label="Téléphone" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" className="h-4 w-4 accent-neutral-950" checked={draft.save} onChange={(e) => setDraft((d) => ({ ...d, save: e.target.checked }))} />
          Enregistrer dans mes proches
        </label>
        {draft.save && (
          <Select className="w-44" size="sm" aria-label="Lien" value={draft.relationship} onValueChange={(relationship) => setDraft((d) => ({ ...d, relationship }))}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => void submit()} disabled={busy} className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {busy ? 'Ajout...' : 'Ajouter'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-neutral-300 px-5 py-2 text-sm text-neutral-800 hover:bg-white">
          Annuler
        </button>
      </div>
    </div>
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
  const serviceById = useMemo(() => new Map(bookableServices.map((s) => [s.id, s])), [bookableServices]);

  const [people, setPeople] = useState<BookingPerson[]>(() => [
    { key: 'me', kind: 'me', firstName: 'Moi', lastName: '', serviceIds: params.get('prestation') ? [params.get('prestation')!] : [], employees: {} },
  ]);
  const [activeKey, setActiveKey] = useState('me');
  const [addingGuest, setAddingGuest] = useState(false);
  const [date, setDate] = useState<string>(() => toISODate(startOfDay(new Date())));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Services the salon does not offer online (old link) are dropped.
  const valid = people.map((p) => ({ ...p, serviceIds: p.serviceIds.filter((sid) => serviceById.has(sid)) }));
  const active = valid.find((p) => p.key === activeKey) ?? valid[0]!;
  const isGroup = valid.length > 1;
  const ready = groupReady(valid);
  const label = (p: BookingPerson) => (p.kind === 'me' ? 'Moi' : p.firstName);

  const request = ready ? slotRequest(valid, client?.email) : null;
  const advance = Math.min(Math.max(salon?.settings?.bookingAdvanceDays ?? DAYS_SHOWN, 1), 90);
  const days = useMemo(() => Array.from({ length: Math.min(advance, DAYS_SHOWN * 2) }, (_, i) => addDays(startOfDay(new Date()), i)), [advance]);
  const dayKeys = useMemo(() => days.map(toISODate), [days]);
  const weekHours = useMemo(() => openingHours(salon?.settings?.businessHours), [salon]);

  // Free times of every day shown, computed like the final booking check, so
  // each day says up front whether it has room (same approach as the mobile app).
  const availKey = tenantId && request ? `client-days:${tenantId}:${dayKeys[0]}:${dayKeys.length}:${JSON.stringify(request)}` : null;
  const availability = useApiQuery(availKey, async () => {
    const found: Record<string, string[]> = {};
    await mapLimit(dayKeys, 4, async (d) => {
      found[d] = await discovery.slots(tenantId!, d, request!).catch(() => []);
    });
    return found;
  });
  const byDay = availability.loading ? undefined : availability.data;
  const daySlots = byDay?.[date] ?? [];
  const firstFree = byDay ? dayKeys.find((d) => (byDay[d]?.length ?? 0) > 0) : undefined;

  // New results: jump to the first day with room when the chosen one has none.
  const [autoFor, setAutoFor] = useState<string | null>(null);
  if (byDay && availKey && autoFor !== availKey) {
    setAutoFor(availKey);
    if (!byDay[date]?.length && firstFree) setDate(firstFree);
  }

  // A new date, person or service invalidates the chosen time.
  const slotKey = `${availKey}:${date}`;
  const [lastSlotKey, setLastSlotKey] = useState(slotKey);
  if (lastSlotKey !== slotKey) {
    setLastSlotKey(slotKey);
    setTime(null);
  }
  const needsPhone = !client?.phone;
  const full = valid.length >= MAX_GROUP;

  const update = (key: string, fn: (p: BookingPerson) => BookingPerson) => setPeople((list) => list.map((p) => (p.key === key ? fn(p) : p)));
  const toggleService = (sid: string) =>
    update(active.key, (p) => ({ ...p, serviceIds: p.serviceIds.includes(sid) ? p.serviceIds.filter((x) => x !== sid) : [...p.serviceIds, sid] }));

  /** New people start with the same services as the person being edited. */
  const addPerson = (person: Omit<BookingPerson, 'serviceIds' | 'employees'>) => {
    setPeople((list) => (list.some((p) => p.key === person.key) || list.length >= MAX_GROUP ? list : [...list, { ...person, serviceIds: [...active.serviceIds], employees: {} }]));
    setActiveKey(person.key);
  };
  const removePerson = (key: string) => {
    if (valid.length <= 1) return;
    setPeople((list) => list.filter((p) => p.key !== key));
    if (activeKey === key) setActiveKey(valid.find((p) => p.key !== key)!.key);
  };
  const togglePerson = (key: string, make: () => Omit<BookingPerson, 'serviceIds' | 'employees'>) =>
    valid.some((p) => p.key === key) ? removePerson(key) : addPerson(make());
  const fromMember = (m: FamilyMember) => ({ key: m.id, kind: 'proche' as const, firstName: m.firstName, lastName: m.lastName ?? '', phone: m.phone, email: m.email });
  const copyToAll = () => setPeople((list) => list.map((p) => ({ ...p, serviceIds: [...active.serviceIds], employees: { ...active.employees } })));

  const addGuest = async (g: GuestDraft) => {
    const base = { firstName: g.firstName.trim(), lastName: g.lastName.trim(), phone: g.phone.trim() ? normalizePhone(g.phone) : null };
    if (g.save && client) {
      const res = await clientAccount.addFamily({ ...base, relationship: g.relationship, clientEmail: client.email });
      await family.refetch();
      if (res.familyMember?.id) {
        addPerson(fromMember(res.familyMember));
        setAddingGuest(false);
        return;
      }
    }
    addPerson({ key: `guest-${crypto.randomUUID()}`, kind: 'guest', ...base, email: null });
    setAddingGuest(false);
  };

  const confirm = async () => {
    if (!client || !tenantId || !time || !ready) return;
    const bookerPhone = normalizePhone(client.phone || phone);
    if (!isValidPhone(bookerPhone)) {
      setError('Indiquez un numéro de téléphone valide pour que le salon puisse vous joindre.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await clientAccount.book(
        buildBooking({
          tenantId,
          booker: { firstName: client.firstName, lastName: client.lastName, email: client.email, phone: bookerPhone },
          people: valid,
          startTime: `${date}T${time}:00`,
          notes,
        }),
      );
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
      void availability.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  if (status !== 'authenticated') return <LoadingState />;

  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalPrice = valid.reduce((t, p) => t + p.serviceIds.reduce((u, sid) => u + priceOf(serviceById.get(sid)!), 0), 0);

  if (done && salon) {
    const names = valid.map((p) => (p.kind === 'me' ? 'vous' : p.firstName));
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-600" />
        <h1 className="mt-5 text-3xl font-medium text-neutral-950">{isGroup ? 'Rendez vous de groupe réservé' : 'Rendez vous réservé'}</h1>
        <p className="mt-3 text-neutral-600">
          {salon.name}, le {dayLabel} à {time}
          {valid.length === 1 && valid[0]!.kind === 'me' ? '' : `, pour ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' et ' : ''}${names[names.length - 1]}`}.
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
              <Step n={1} title="Pour qui ?" done>
                <p className="mb-3 text-sm text-neutral-500">Sélectionnez une ou plusieurs personnes. Un groupe est reçu à la même heure.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={valid.some((p) => p.key === 'me')} onClick={() => togglePerson('me', () => ({ key: 'me', kind: 'me', firstName: 'Moi', lastName: '' }))} className={chip(valid.some((p) => p.key === 'me'))}>
                    <UserRound size={15} /> Moi
                  </button>
                  {(family.data ?? []).map((m) => {
                    const on = valid.some((p) => p.key === m.id);
                    return (
                      <button key={m.id} type="button" aria-pressed={on} disabled={!on && full} onClick={() => togglePerson(m.id, () => fromMember(m))} className={`${chip(on)} disabled:opacity-40`}>
                        {on && <Check size={14} />}
                        {m.firstName} <span className={on ? 'text-white/60' : 'text-neutral-400'}>{m.relationship}</span>
                      </button>
                    );
                  })}
                  {valid
                    .filter((p) => p.kind === 'guest')
                    .map((p) => (
                      <button key={p.key} type="button" onClick={() => removePerson(p.key)} className={chip(true)} aria-label={`Retirer ${fullName(p)}`}>
                        {fullName(p)} <X size={14} />
                      </button>
                    ))}
                  {!addingGuest && !full && (
                    <button type="button" onClick={() => setAddingGuest(true)} className="inline-flex items-center gap-2 rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-950 hover:text-neutral-950">
                      <Plus size={15} /> Ajouter une personne
                    </button>
                  )}
                </div>
                {full && <p className="mt-3 text-xs text-neutral-500">{MAX_GROUP} personnes maximum par réservation.</p>}
                {addingGuest && <GuestForm onAdd={addGuest} onCancel={() => setAddingGuest(false)} />}
              </Step>

              <Step n={2} title="Prestations" done={ready}>
                {isGroup && (
                  <div className="mb-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Personne">
                    {valid.map((p) => (
                      <button key={p.key} type="button" role="tab" aria-selected={p.key === active.key} onClick={() => setActiveKey(p.key)} className={chip(p.key === active.key)}>
                        {label(p)}
                        <span className={`rounded-full px-1.5 text-xs ${p.key === active.key ? 'bg-white/20' : p.serviceIds.length ? 'bg-neutral-950 text-white' : 'bg-red-100 text-red-700'}`}>{p.serviceIds.length}</span>
                      </button>
                    ))}
                    {active.serviceIds.length > 0 && (
                      <button type="button" onClick={copyToAll} className="ml-auto inline-flex items-center gap-1.5 text-sm text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline">
                        <Copy size={14} /> Mêmes prestations pour tous
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-5">
                  {groupServices(bookableServices).map(([category, items]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{category}</p>
                      <ul className="space-y-2">
                        {items.map((s) => {
                          const on = active.serviceIds.includes(s.id);
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => toggleService(s.id)}
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

              {valid.some((p) => p.serviceIds.length > 0) && (
                <Step n={3} title="Professionnel" done>
                  <div className="space-y-5">
                    {valid
                      .filter((p) => p.serviceIds.length > 0)
                      .map((p) => (
                        <div key={p.key} className="space-y-3">
                          {isGroup && <p className="text-sm font-medium text-neutral-950">{p.kind === 'me' ? 'Moi' : fullName(p)}</p>}
                          {p.serviceIds.map((sid) => {
                            const s = serviceById.get(sid)!;
                            return (
                              <div key={sid} className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm text-neutral-700">{s.name}</span>
                                <Select
                                  className="w-full sm:w-72"
                                  aria-label={`Professionnel pour ${s.name}${isGroup ? `, ${label(p)}` : ''}`}
                                  value={p.employees[sid] ?? ANY}
                                  onValueChange={(v) => update(p.key, (x) => ({ ...x, employees: { ...x.employees, [sid]: v } }))}
                                >
                                  <option value={ANY}>Sans préférence</option>
                                  {(s.employees ?? []).map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.firstName} {e.lastName}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                </Step>
              )}

              {ready && (
                <Step n={4} title="Date et heure" done={!!time}>
                  <ScrollRow label="Jours">
                    {days.map((d) => {
                      const iso = toISODate(d);
                      const on = iso === date;
                      const closed = isClosedOn(weekHours, d);
                      const count = closed ? 0 : byDay?.[iso]?.length;
                      const none = count === 0;
                      const noneLabel = closed ? 'Fermé' : 'Complet';
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setDate(iso)}
                          disabled={none}
                          aria-pressed={on}
                          aria-label={`${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${count === undefined ? 'disponibilités en cours de calcul' : none ? noneLabel.toLowerCase() : `${count} créneaux`}`}
                          className={`flex w-[72px] shrink-0 flex-col items-center rounded-2xl border py-2.5 text-sm transition disabled:cursor-not-allowed ${
                            on ? 'border-neutral-950 bg-neutral-950 text-white' : none ? 'border-neutral-100 bg-neutral-50 text-neutral-300' : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          <span className={`text-[11px] uppercase ${on ? 'text-white/70' : none ? '' : 'text-neutral-500'}`}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                          <span className="text-lg font-medium">{d.getDate()}</span>
                          <span className={`text-[11px] ${on ? 'text-white/70' : none ? '' : 'text-neutral-400'}`}>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
                          <span className={`mt-1 h-4 text-[10px] font-medium ${on ? 'text-white' : none ? 'text-neutral-400' : 'text-emerald-700'}`}>
                            {count === undefined ? <span className="inline-block h-1.5 w-6 animate-pulse rounded-full bg-neutral-200" /> : none ? noneLabel : `${count} dispo`}
                          </span>
                        </button>
                      );
                    })}
                  </ScrollRow>
                  <div className="mt-5">
                    {!byDay ? (
                      <p className="text-sm text-neutral-500">Recherche des créneaux disponibles...</p>
                    ) : availability.error ? (
                      <p className="text-sm text-red-700">{errorMessage(availability.error)}</p>
                    ) : !firstFree ? (
                      <p className="text-sm text-neutral-500">
                        {isGroup
                          ? `Aucun créneau pour tout le groupe à la même heure sur les ${days.length} prochains jours. Essayez avec moins de personnes ou d'autres prestations.`
                          : `Aucun créneau sur les ${days.length} prochains jours. Essayez un autre professionnel ou d'autres prestations.`}
                      </p>
                    ) : daySlots.length === 0 ? (
                      <p className="text-sm text-neutral-500">Ce jour est complet. Choisissez un jour marqué disponible.</p>
                    ) : (
                      <div className="space-y-4">
                        {slotsByPeriod(daySlots).map(([period, list]) => (
                          <div key={period}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                              {period} <span className="font-normal normal-case tracking-normal text-neutral-400">({list.length})</span>
                            </p>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                              {list.map((t) => (
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Step>
              )}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <Card title="Récapitulatif">
                {!valid.some((p) => p.serviceIds.length > 0) ? (
                  <p className="text-sm text-neutral-500">Choisissez une ou plusieurs prestations.</p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="space-y-4">
                      {valid.map((p) => (
                        <div key={p.key}>
                          {isGroup && (
                            <p className="mb-1.5 flex justify-between font-medium text-neutral-950">
                              <span>{p.kind === 'me' ? 'Moi' : fullName(p)}</span>
                              {p.serviceIds.length > 0 && <span className="font-normal text-neutral-500">{durationLabel(p.serviceIds.reduce((t, sid) => t + serviceById.get(sid)!.duration, 0))}</span>}
                            </p>
                          )}
                          {p.serviceIds.length === 0 ? (
                            <p className="text-red-700">Aucune prestation choisie.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {p.serviceIds.map((sid) => {
                                const s = serviceById.get(sid)!;
                                return (
                                  <li key={sid} className="flex justify-between gap-3">
                                    <span className="text-neutral-800">{s.name}</span>
                                    <span className="shrink-0 text-neutral-600">{servicePrice(s)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 border-t border-neutral-100 pt-3 text-neutral-600">
                      {!isGroup && <p>Durée : {durationLabel(valid[0]!.serviceIds.reduce((t, sid) => t + serviceById.get(sid)!.duration, 0))}</p>}
                      <p>{isGroup ? `${valid.length} personnes, même heure d'arrivée` : `Pour : ${valid[0]!.kind === 'me' ? 'moi' : fullName(valid[0]!)}`}</p>
                      {time && <p className="text-neutral-950">{dayLabel} à {time}</p>}
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
                      disabled={!time || !ready || submitting}
                      className="w-full rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? 'Réservation...' : !ready ? 'Une prestation par personne' : time ? (isGroup ? `Réserver pour ${valid.length} personnes` : 'Confirmer le rendez vous') : 'Choisissez un créneau'}
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
