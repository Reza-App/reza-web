'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField, fieldClass, timeFieldClass, SecondaryButton } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { Switch } from '@/components/ui/switch';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { tenantService } from '@/lib/api/services/tenant.service';
import { formatDate } from '@/lib/format';
import { type BusinessHours, DAY_NAMES, type DaySchedule, type DelaySetting } from '@/lib/types/tenant';
import { Select } from '@/components/ui/select';

const UNITS = { heures: 'heures', jours: 'jours', semaines: 'semaines', mois: 'mois' };

function withDefaults(hours: BusinessHours): BusinessHours {
  const schedules = DAY_NAMES.map(
    (day) =>
      hours.schedules?.find((s) => s.day === day) ?? { day, isOpen: day !== 'Dimanche', openTime: '09:00', closeTime: '19:00', breaks: [] },
  );
  return {
    ...hours,
    onlineBooking: hours.onlineBooking ?? 'open',
    schedules: schedules.map((s) => ({ ...s, breaks: s.breaks ?? [] })),
    agendaStart: hours.agendaStart ?? '08:00',
    agendaEnd: hours.agendaEnd ?? '21:00',
    bookingDelay: hours.bookingDelay ?? { value: '1', unit: 'heures', allowLastMoment: false },
    cancellationDelay: hours.cancellationDelay ?? { value: '24', unit: 'heures', allowLastMoment: false },
    advanceBooking: hours.advanceBooking ?? { value: '1', unit: 'mois' },
    blockedDates: hours.blockedDates ?? [],
  };
}

function DelayField({ label, hint, value, units, onChange }: { label: string; hint: string; value: DelaySetting; units: (keyof typeof UNITS)[]; onChange: (v: DelaySetting) => void }) {
  return (
    <FormField label={label} hint={hint} group>
      <div className="flex gap-2">
        <input
          className={`${fieldClass} w-24`}
          inputMode="numeric"
          value={value.value}
          aria-label={`${label} valeur`}
          onChange={(e) => onChange({ ...value, value: e.target.value.replace(/\D/g, '').slice(0, 3) })}
        />
        <Select value={value.unit} aria-label={`${label} unité`} onValueChange={(v) => onChange({ ...value, unit: v })}>
          {units.map((u) => (
            <option key={u} value={u}>
              {UNITS[u]}
            </option>
          ))}
        </Select>
      </div>
    </FormField>
  );
}

function validate(hours: BusinessHours): string | null {
  for (const s of hours.schedules) {
    if (!s.isOpen) continue;
    if (s.openTime >= s.closeTime) return `${s.day} : l'heure de fermeture doit suivre l'ouverture.`;
    for (const b of s.breaks) {
      if (b.start >= b.end || b.start < s.openTime || b.end > s.closeTime) return `${s.day} : pause en dehors des horaires d'ouverture.`;
    }
  }
  if ((hours.agendaStart ?? '') >= (hours.agendaEnd ?? '')) return "L'agenda doit commencer avant de finir.";
  return null;
}

export default function BusinessHoursPage() {
  const form = useSettingsForm(
    'business-hours',
    async (signal) => withDefaults(await tenantService.businessHours(signal)),
    async (draft) => {
      const problem = validate(draft);
      if (problem) throw new Error(problem);
      await tenantService.updateBusinessHours(draft);
    },
    'Horaires enregistrés.',
  );
  const [blocked, setBlocked] = useState('');
  const hours = form.draft;

  const setDay = (index: number, patch: Partial<DaySchedule>) =>
    form.setDraft((d) => d && { ...d, schedules: d.schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  const set = (patch: Partial<BusinessHours>) => form.setDraft((d) => d && { ...d, ...patch });

  return (
    <div>
      <PageHeader
        title="Horaires et délais"
        description="Heures d'ouverture, pauses et règles de réservation en ligne."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!hours} error={form.query.error} onRetry={form.query.refetch}>
        {hours && (
          <div className="space-y-6">
            <Card title="Horaires d'ouverture">
              <div className="divide-y divide-neutral-100">
                {hours.schedules.map((s, i) => (
                  <div key={s.day} className="flex flex-wrap items-center gap-4 py-3">
                    <span className="w-28 text-sm font-medium text-neutral-950">{s.day}</span>
                    <Switch checked={s.isOpen} label={`${s.day} ouvert`} onChange={(isOpen) => setDay(i, { isOpen })} />
                    {s.isOpen ? (
                      <>
                        <input type="time" className={timeFieldClass} value={s.openTime} onChange={(e) => setDay(i, { openTime: e.target.value })} aria-label={`${s.day} ouverture`} />
                        <span className="text-sm text-neutral-400">à</span>
                        <input type="time" className={timeFieldClass} value={s.closeTime} onChange={(e) => setDay(i, { closeTime: e.target.value })} aria-label={`${s.day} fermeture`} />
                        <div className="flex flex-wrap items-center gap-2">
                          {s.breaks.map((b, bi) => (
                            <span key={bi} className="flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-1 text-xs">
                              Pause
                              <input
                                type="time"
                                value={b.start}
                                aria-label="Début de pause"
                                className="bg-transparent"
                                onChange={(e) => setDay(i, { breaks: s.breaks.map((x, xi) => (xi === bi ? { ...x, start: e.target.value } : x)) })}
                              />
                              <input
                                type="time"
                                value={b.end}
                                aria-label="Fin de pause"
                                className="bg-transparent"
                                onChange={(e) => setDay(i, { breaks: s.breaks.map((x, xi) => (xi === bi ? { ...x, end: e.target.value } : x)) })}
                              />
                              <button type="button" onClick={() => setDay(i, { breaks: s.breaks.filter((_, xi) => xi !== bi) })} aria-label="Retirer la pause">
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setDay(i, { breaks: [...s.breaks, { start: '13:00', end: '14:00' }] })}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                          >
                            <Plus size={13} /> Pause
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-400">Fermé</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Réservation en ligne">
                <ToggleRow
                  title="Réservations en ligne ouvertes"
                  description="Vos clients peuvent réserver depuis l'application Selia."
                  checked={hours.onlineBooking !== 'closed'}
                  onChange={(open) => set({ onlineBooking: open ? 'open' : 'closed' })}
                />
                <div className="mt-2 grid gap-4">
                  <DelayField
                    label="Délai minimum avant un RDV"
                    hint="Un client ne peut pas réserver moins de ce délai à l'avance."
                    value={hours.bookingDelay!}
                    units={['heures', 'jours']}
                    onChange={(bookingDelay) => set({ bookingDelay })}
                  />
                  <DelayField
                    label="Délai d'annulation"
                    hint="Jusqu'à quand un client peut annuler lui même."
                    value={hours.cancellationDelay!}
                    units={['heures', 'jours']}
                    onChange={(cancellationDelay) => set({ cancellationDelay })}
                  />
                  <DelayField
                    label="Réservation possible jusqu'à"
                    hint="Horizon maximal de réservation."
                    value={hours.advanceBooking!}
                    units={['jours', 'semaines', 'mois']}
                    onChange={(advanceBooking) => set({ advanceBooking })}
                  />
                </div>
              </Card>

              <div className="space-y-6">
                <Card title="Plage de l'agenda">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Début">
                      <input type="time" className={fieldClass} value={hours.agendaStart} onChange={(e) => set({ agendaStart: e.target.value })} />
                    </FormField>
                    <FormField label="Fin">
                      <input type="time" className={fieldClass} value={hours.agendaEnd} onChange={(e) => set({ agendaEnd: e.target.value })} />
                    </FormField>
                  </div>
                </Card>
                <Card title="Jours de fermeture exceptionnelle">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(hours.blockedDates ?? []).map((d) => (
                      <span key={d} className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-sm">
                        {formatDate(`${d}T12:00:00`)}
                        <button type="button" onClick={() => set({ blockedDates: hours.blockedDates!.filter((x) => x !== d) })} aria-label={`Retirer le ${d}`}>
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                    {(hours.blockedDates ?? []).length === 0 && <p className="text-sm text-neutral-400">Aucune date.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input type="date" className={fieldClass} value={blocked} onChange={(e) => setBlocked(e.target.value)} aria-label="Date de fermeture" />
                    <SecondaryButton
                      disabled={!blocked || hours.blockedDates?.includes(blocked)}
                      onClick={() => {
                        set({ blockedDates: [...(hours.blockedDates ?? []), blocked].sort() });
                        setBlocked('');
                      }}
                    >
                      <Plus size={15} /> Ajouter
                    </SecondaryButton>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
