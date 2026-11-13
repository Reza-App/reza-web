'use client';

import { useState } from 'react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { clientService, type ClientInput } from '@/lib/api/services/catalog.service';
import { preferencesService } from '@/lib/api/services/preferences.service';
import { errorMessage } from '@/lib/api/errors';
import type { Client } from '@/lib/types/catalog';
import { type FieldErrors, hasErrors, isValidEmail, isValidPhone, messages, normalizePhone, validate } from '@/lib/validation';
import { Select } from '@/components/ui/select';

type Field = 'firstName' | 'lastName' | 'phone' | 'email' | 'gender' | 'birth' | 'address';

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  BLOCKED: 'Bloqué',
};

export function ClientFormDialog({
  client,
  onClose,
  onSaved,
}: {
  /** Existing client to edit, or null to create one. */
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}) {
  const toast = useToast();
  const prefs = useApiQuery('preferences', (signal) => preferencesService.get(signal));
  const rules = prefs.data?.clientFile;

  const [form, setForm] = useState({
    firstName: client?.firstName ?? '',
    lastName: client?.lastName ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    gender: client?.gender ?? '',
    birth: client?.dateOfBirth ? client.dateOfBirth.slice(0, 10) : '',
    address: client?.address ?? '',
    notes: client?.notes ?? '',
    status: (client?.status as string) ?? 'ACTIVE',
  });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const yearOnly = !!rules?.birthDate.yearOnly;
  const birthValue = yearOnly ? form.birth.slice(0, 4) : form.birth;

  const submit = async () => {
    const nextErrors = validate<Field>({
      firstName: () => (form.firstName.trim() ? null : messages.required),
      lastName: () => (form.lastName.trim() ? null : messages.required),
      phone: () => (isValidPhone(form.phone) ? null : messages.phone),
      email: () => (!form.email.trim() || isValidEmail(form.email) ? null : messages.email),
      gender: () => (rules?.gender.display && rules.gender.required && !form.gender ? messages.required : null),
      birth: () => (rules?.birthDate.display && rules.birthDate.required && !form.birth ? messages.required : null),
      address: () => (rules?.address.display && rules.address.required && !form.address.trim() ? messages.required : null),
    });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const birth = form.birth ? (yearOnly ? `${form.birth.slice(0, 4)}-01-01` : form.birth) : '';
    const input: ClientInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim() || undefined,
      gender: form.gender === 'male' || form.gender === 'female' ? form.gender : undefined,
      dateOfBirth: birth ? new Date(`${birth}T12:00:00Z`).toISOString() : undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status as ClientInput['status'],
    };

    setBusy(true);
    try {
      const saved = client ? await clientService.update(client.id, input) : await clientService.create(input);
      toast.success(client ? 'Fiche client mise à jour.' : 'Client ajouté.');
      onSaved(saved);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      backLabel="Retour aux clients"
      open
      title={client ? 'Modifier la fiche client' : 'Nouveau client'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Annuler
          </SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Prénom" error={errors.firstName}>
          <input className={fieldClass} value={form.firstName} onChange={set('firstName')} autoComplete="off" />
        </FormField>
        <FormField label="Nom" error={errors.lastName}>
          <input className={fieldClass} value={form.lastName} onChange={set('lastName')} autoComplete="off" />
        </FormField>
        <FormField label="Téléphone" error={errors.phone}>
          <input className={fieldClass} type="tel" value={form.phone} onChange={set('phone')} placeholder="06 12 34 56 78" />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <input className={fieldClass} type="email" value={form.email} onChange={set('email')} />
        </FormField>
        {rules?.gender.display !== false && (
          <FormField label={`Genre${rules?.gender.required ? '' : ' (facultatif)'}`} error={errors.gender}>
            <Select value={form.gender} onValueChange={(gender) => setForm((f) => ({ ...f, gender }))}>
              <option value="">Non renseigné</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </Select>
          </FormField>
        )}
        {rules?.birthDate.display !== false && (
          <FormField label={`${yearOnly ? 'Année de naissance' : 'Date de naissance'}${rules?.birthDate.required ? '' : ' (facultatif)'}`} error={errors.birth}>
            {yearOnly ? (
              <input
                className={fieldClass}
                inputMode="numeric"
                maxLength={4}
                value={birthValue}
                onChange={(e) => setForm((f) => ({ ...f, birth: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="1990"
              />
            ) : (
              <input className={fieldClass} type="date" value={form.birth} onChange={set('birth')} />
            )}
          </FormField>
        )}
        {rules?.address.display !== false && (
          <FormField
            className="sm:col-span-2"
            label={`${rules?.address.postalCodeOnly ? 'Code postal' : 'Adresse'}${rules?.address.required ? '' : ' (facultatif)'}`}
            error={errors.address}
          >
            <input className={fieldClass} value={form.address} onChange={set('address')} />
          </FormField>
        )}
        <FormField label="Statut">
          <Select value={form.status} onValueChange={(status) => setForm((f) => ({ ...f, status }))}>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField className="sm:col-span-2" label="Notes internes (facultatif)">
          <textarea className={fieldClass} rows={3} maxLength={1000} value={form.notes} onChange={set('notes')} />
        </FormField>
      </div>
    </Modal>
  );
}
