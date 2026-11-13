'use client';

import { useState } from 'react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass, timeFieldClass } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { employeeService, type EmployeeInput } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import type { AgendaSettings, Employee, Service, WorkingDay } from '@/lib/types/catalog';
import { DAY_NAMES } from '@/lib/types/tenant';
import { isValidEmail, isValidPhone, messages, normalizePhone } from '@/lib/validation';
import { Select } from '@/components/ui/select';

const DEFAULT_HOURS: WorkingDay[] = DAY_NAMES.map((day) => ({
  day,
  isWorking: day !== 'Dimanche',
  startTime: '09:00',
  endTime: '19:00',
  breaks: [],
}));

type Tab = 'profil' | 'horaires' | 'prestations';

export function EmployeeFormDialog({
  employee,
  services,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('profil');
  const [form, setForm] = useState({
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    gender: employee?.gender ?? '',
    isActive: employee?.isActive ?? true,
  });
  const [agenda, setAgenda] = useState<AgendaSettings>({
    role: '',
    color: '#0a0a0a',
    allowOnlineBooking: true,
    timeSlotDuration: 30,
    bufferTime: 0,
    maxAppointmentsPerDay: 12,
    ...employee?.agendaSettings,
  });
  const [hours, setHours] = useState<WorkingDay[]>(() =>
    DAY_NAMES.map((day) => employee?.workingHours?.find((d) => d.day === day) ?? DEFAULT_HOURS.find((d) => d.day === day)!),
  );
  const [serviceIds, setServiceIds] = useState<string[]>(() =>
    services.filter((s) => s.employeeServices?.some((es) => es.employeeId === employee?.id)).map((s) => s.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setDay = (i: number, patch: Partial<WorkingDay>) => setHours((h) => h.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return (setTab('profil'), setError('Le prénom et le nom sont requis.'));
    if (!isValidPhone(form.phone)) return (setTab('profil'), setError(messages.phone));
    if (form.email && !isValidEmail(form.email)) return (setTab('profil'), setError(messages.email));
    const badDay = hours.find((d) => d.isWorking && d.startTime >= d.endTime);
    if (badDay) return (setTab('horaires'), setError(`${badDay.day} : la fin doit suivre le début.`));

    const input: EmployeeInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim() || undefined,
      gender: form.gender === 'male' || form.gender === 'female' ? form.gender : undefined,
      isActive: form.isActive,
      agendaSettings: { ...agenda, role: agenda.role?.trim() },
      workingHours: hours,
      serviceIds,
    };
    setBusy(true);
    setError(null);
    try {
      if (employee) await employeeService.update(employee.id, input);
      else await employeeService.create(input);
      toast.success(employee ? 'Agenda mis à jour.' : 'Collaborateur ajouté.');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      backLabel="Retour aux agendas"
      open
      size="lg"
      title={employee ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="mb-6 flex rounded-full bg-neutral-100 p-1 text-sm" role="tablist">
        {(['profil', 'horaires', 'prestations'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 capitalize transition ${tab === t ? 'bg-white font-medium text-neutral-950 shadow-sm' : 'text-neutral-500'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {tab === 'profil' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prénom">
            <input className={fieldClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </FormField>
          <FormField label="Nom">
            <input className={fieldClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </FormField>
          <FormField label="Téléphone">
            <input className={fieldClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Email (facultatif)">
            <input className={fieldClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Poste">
            <input className={fieldClass} maxLength={60} value={agenda.role ?? ''} onChange={(e) => setAgenda({ ...agenda, role: e.target.value })} placeholder="Coiffeuse, esthéticienne..." />
          </FormField>
          <FormField label="Couleur de l'agenda">
            <input type="color" className="h-[42px] w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-1" value={agenda.color ?? '#0a0a0a'} onChange={(e) => setAgenda({ ...agenda, color: e.target.value })} />
          </FormField>
          <FormField label="Intervalle des créneaux">
            <Select value={agenda.timeSlotDuration} onValueChange={(v) => setAgenda({ ...agenda, timeSlotDuration: Number(v) })}>
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Temps de battement">
            <Select value={agenda.bufferTime} onValueChange={(v) => setAgenda({ ...agenda, bufferTime: Number(v) })}>
              {[0, 5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </FormField>
          <div className="sm:col-span-2 flex flex-wrap gap-8 pt-2">
            <label className="flex items-center gap-3 text-sm text-neutral-800">
              <Switch checked={!!agenda.allowOnlineBooking} label="Réservable en ligne" onChange={(v) => setAgenda({ ...agenda, allowOnlineBooking: v })} />
              Réservable en ligne
            </label>
            <label className="flex items-center gap-3 text-sm text-neutral-800">
              <Switch checked={form.isActive} label="Actif" onChange={(v) => setForm({ ...form, isActive: v })} />
              Collaborateur actif
            </label>
          </div>
        </div>
      )}

      {tab === 'horaires' && (
        <div className="divide-y divide-neutral-100">
          {hours.map((d, i) => (
            <div key={d.day} className="flex flex-wrap items-center gap-4 py-3">
              <span className="w-24 text-sm font-medium text-neutral-950">{d.day}</span>
              <Switch checked={d.isWorking} label={`${d.day} travaillé`} onChange={(isWorking) => setDay(i, { isWorking })} />
              {d.isWorking ? (
                <>
                  <input type="time" className={timeFieldClass} value={d.startTime} onChange={(e) => setDay(i, { startTime: e.target.value })} aria-label={`${d.day} début`} />
                  <span className="text-sm text-neutral-400">à</span>
                  <input type="time" className={timeFieldClass} value={d.endTime} onChange={(e) => setDay(i, { endTime: e.target.value })} aria-label={`${d.day} fin`} />
                  <label className="flex items-center gap-2 text-xs text-neutral-600">
                    <input
                      type="checkbox"
                      className="accent-neutral-950"
                      checked={d.breaks.length > 0}
                      onChange={(e) => setDay(i, { breaks: e.target.checked ? [{ start: '13:00', end: '14:00' }] : [] })}
                    />
                    Pause déjeuner
                  </label>
                  {d.breaks[0] && (
                    <span className="flex items-center gap-1 text-xs">
                      <input type="time" value={d.breaks[0].start} aria-label="Début de pause" onChange={(e) => setDay(i, { breaks: [{ ...d.breaks[0], start: e.target.value }] })} />
                      <input type="time" value={d.breaks[0].end} aria-label="Fin de pause" onChange={(e) => setDay(i, { breaks: [{ ...d.breaks[0], end: e.target.value }] })} />
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-neutral-400">Repos</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'prestations' && (
        <div className="flex flex-wrap gap-2">
          {services.map((s) => {
            const active = serviceIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setServiceIds((ids) => (active ? ids.filter((x) => x !== s.id) : [...ids, s.id]))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                {s.name}
              </button>
            );
          })}
          {services.length === 0 && <p className="text-sm text-neutral-500">Aucune prestation créée.</p>}
        </div>
      )}
    </Modal>
  );
}
