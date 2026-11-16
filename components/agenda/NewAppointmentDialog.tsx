'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { ClientSearch } from '@/components/clients/ClientSearch';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useServices } from '@/hooks/useReferenceData';
import { appointmentService } from '@/lib/api/services/appointment.service';
import { clientService } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { atTime, formatDuration, formatMoney, toISODate, toTimeLabel } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';
import { isValidEmail, isValidPhone, messages, normalizePhone } from '@/lib/validation';
import { Select } from '@/components/ui/select';

interface NewClientDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

function ClientPicker({
  selected,
  onSelect,
  draft,
  onDraft,
  walkIn,
  onWalkIn,
}: {
  selected: Client | null;
  onSelect: (client: Client | null) => void;
  draft: NewClientDraft | null;
  onDraft: (draft: NewClientDraft | null) => void;
  walkIn: string | null;
  onWalkIn: (name: string | null) => void;
}) {
  if (draft) {
    const set = (key: keyof NewClientDraft) => (e: React.ChangeEvent<HTMLInputElement>) => onDraft({ ...draft, [key]: e.target.value });
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-950">Nouveau client</p>
          <button type="button" onClick={() => onDraft(null)} className="text-xs font-medium text-neutral-500 hover:text-neutral-950">
            Rechercher plutôt
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={fieldClass} placeholder="Prénom" value={draft.firstName} onChange={set('firstName')} aria-label="Prénom" />
          <input className={fieldClass} placeholder="Nom" value={draft.lastName} onChange={set('lastName')} aria-label="Nom" />
          <input className={fieldClass} placeholder="Téléphone" value={draft.phone} onChange={set('phone')} aria-label="Téléphone" type="tel" />
          <input className={fieldClass} placeholder="Email (facultatif)" value={draft.email} onChange={set('email')} aria-label="Email" type="email" />
        </div>
      </div>
    );
  }

  return (
    <ClientSearch
      selected={selected}
      onSelect={onSelect}
      walkInName={walkIn}
      onWalkIn={(name) => onWalkIn(name)}
      onClearWalkIn={() => onWalkIn(null)}
      onCreate={(typed) => {
        const [firstName = '', ...rest] = typed.split(/\s+/);
        onDraft({ firstName, lastName: rest.join(' '), phone: '', email: '' });
      }}
    />
  );
}

export function NewAppointmentDialog({
  initialStart,
  onClose,
  onCreated,
}: {
  initialStart: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const { data: catalog } = useServices();
  const [client, setClient] = useState<Client | null>(null);
  const [draft, setDraft] = useState<NewClientDraft | null>(null);
  /** Walk in client: a name only, no client file. */
  const [walkIn, setWalkIn] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(toISODate(initialStart));
  const [time, setTime] = useState(toTimeLabel(initialStart));
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  const services = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.visibility !== 'HIDDEN'),
    [catalog],
  );
  const selected = serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as typeof services;
  const filtered = services.filter((s) => s.name.toLowerCase().includes(serviceSearch.trim().toLowerCase()));

  const planKey = serviceIds.length && date && /^\d{2}:\d{2}$/.test(time) ? `plan:${serviceIds.join(',')}:${date}:${time}:${client?.id ?? ''}` : null;
  const plan = useApiQuery(planKey, (signal) =>
    appointmentService.plan({ serviceIds, date, startTime: time, clientId: client?.id }, signal),
  );

  const employeeFor = (serviceId: string) =>
    assignments[serviceId] ?? plan.data?.recommendedAssignment.find((a) => a.serviceId === serviceId)?.employeeId ?? '';

  const toggleService = (id: string) => setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async () => {
    setError(null);
    if (!client && !draft && !walkIn) return setError('Choisissez un client, créez en un ou saisissez un client de passage.');
    if (draft) {
      if (!draft.firstName.trim() || !draft.lastName.trim()) return setError('Le prénom et le nom du client sont requis.');
      if (!isValidPhone(draft.phone)) return setError(messages.phone);
      if (draft.email && !isValidEmail(draft.email)) return setError(messages.email);
    }
    if (serviceIds.length === 0) return setError('Choisissez au moins une prestation.');
    const start = atTime(new Date(`${date}T00:00:00`), time);
    if (Number.isNaN(start.getTime())) return setError('Date ou heure invalide.');

    setBusy(true);
    try {
      const clientId = walkIn
        ? undefined
        : client?.id ??
        (
          await clientService.create({
            firstName: draft!.firstName.trim(),
            lastName: draft!.lastName.trim(),
            phone: normalizePhone(draft!.phone),
            email: draft!.email.trim() || undefined,
          })
        ).id;

      const items = serviceIds.map((serviceId) => {
        const employeeId = employeeFor(serviceId);
        return employeeId ? { serviceId, employeeId } : { serviceId };
      });

      await appointmentService.create({
        clientId,
        walkInName: walkIn ?? undefined,
        services: items,
        employeeId: items.find((i) => 'employeeId' in i)?.employeeId,
        startTime: start.toISOString(),
        notes: notes.trim() || undefined,
        status: 'CONFIRMED',
      });
      toast.success('Rendez vous créé.');
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const conflicts = plan.data?.alerts ?? [];
  const totalDuration = selected.reduce((t, s) => t + s.duration, 0);
  const totalPrice = selected.reduce((t, s) => t + (s.price ?? 0), 0);

  return (
    <Modal
      open
      size="lg"
      title="Nouveau rendez vous"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Annuler
          </SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            <Check size={16} /> Créer le rendez vous
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <FormField label="Client" group>
          <ClientPicker selected={client} onSelect={setClient} draft={draft} onDraft={setDraft} walkIn={walkIn} onWalkIn={setWalkIn} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date">
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Heure">
            <input type="time" step={900} className={fieldClass} value={time} onChange={(e) => setTime(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Prestations" group>
          <input
            className={`${fieldClass} mb-2`}
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Filtrer les prestations"
            aria-label="Filtrer les prestations"
          />
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {filtered.map((s) => {
              const active = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleService(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {s.name} · {formatDuration(s.duration)}
                </button>
              );
            })}
          </div>
        </FormField>

        {selected.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Collaborateurs</p>
            {plan.loading && <p className="text-sm text-neutral-500">Analyse du planning...</p>}
            {selected.map((s) => {
              const options = plan.data?.services.find((p) => p.serviceId === s.id)?.employees ?? [];
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <span className="w-1/2 truncate text-sm text-neutral-800">{s.name}</span>
                  <Select
                   
                    value={employeeFor(s.id)}
                    onValueChange={(v) => setAssignments((a) => ({ ...a, [s.id]: v }))}
                    aria-label={`Collaborateur pour ${s.name}`}
                  >
                    <option value="">Attribution automatique</option>
                    {options.map((o) => (
                      <option key={o.employeeId} value={o.employeeId}>
                        {o.employeeName}
                        {o.available ? '' : ' (indisponible)'}
                        {o.recommended ? ' (recommandé)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
            {conflicts.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
                {conflicts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {a.message}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-right text-sm text-neutral-600">
              {formatDuration(totalDuration)} · <span className="font-semibold text-neutral-950">{formatMoney(totalPrice)}</span>
              {plan.data?.estimatedEndTime && <> · fin estimée {plan.data.estimatedEndTime}</>}
            </p>
          </div>
        )}

        <FormField label="Note (facultatif)">
          <textarea className={fieldClass} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
