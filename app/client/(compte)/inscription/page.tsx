'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout, Field, FormAlert, inputClass, SubmitButton } from '@/components/auth/AuthLayout';
import { Select } from '@/components/ui/select';
import { errorMessage } from '@/lib/api/errors';
import { clientSession } from '@/lib/api/services/clientArea.service';
import {
  CLIENT_PASSWORD_MIN_LENGTH,
  type FieldErrors,
  hasErrors,
  isValidEmail,
  isValidPhone,
  messages,
  normalizePhone,
  validate,
  errorSummary,
} from '@/lib/validation';

type FieldName = 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirm';
const FIELD_LABELS: Record<FieldName, string> = { firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone', password: 'Mot de passe', confirm: 'Confirmation' };

export default function ClientRegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '', gender: '' });
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate<FieldName>({
      firstName: () => (!form.firstName.trim() ? messages.required : null),
      lastName: () => (!form.lastName.trim() ? messages.required : null),
      email: () => (!form.email.trim() ? messages.required : !isValidEmail(form.email) ? messages.email : null),
      phone: () => (!form.phone.trim() ? messages.required : !isValidPhone(form.phone) ? messages.phone : null),
      password: () => (form.password.length < CLIENT_PASSWORD_MIN_LENGTH ? `Au moins ${CLIENT_PASSWORD_MIN_LENGTH} caractères.` : null),
      confirm: () => (form.confirm !== form.password ? messages.passwordMatch : null),
    });
    setErrors(next);
    setFormError(errorSummary(next, FIELD_LABELS));
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      const r = await clientSession.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizePhone(form.phone),
        password: form.password,
        gender: form.gender || undefined,
      });
      setDone(r.message ?? 'Un email de confirmation vous a été envoyé. Ouvrez le lien pour activer votre compte.');
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout audience="client">
      <h1 className="text-4xl font-medium text-neutral-950">Créer un compte</h1>
      <p className="mt-3 text-sm text-neutral-500">Réservez vos rendez vous beauté en quelques clics.</p>

      {done ? (
        <div className="mt-8 space-y-6">
          <FormAlert tone="success">{done}</FormAlert>
          <Link href="/client/connexion" className="block w-full rounded-full bg-neutral-950 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-neutral-800">
            Aller à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" error={errors.firstName}>
              <input className={inputClass} autoComplete="given-name" value={form.firstName} onChange={set('firstName')} />
            </Field>
            <Field label="Nom" error={errors.lastName}>
              <input className={inputClass} autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Téléphone" error={errors.phone}>
            <input className={inputClass} type="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Genre (facultatif)">
            <Select value={form.gender} onValueChange={(gender) => setForm((f) => ({ ...f, gender }))} aria-label="Genre">
              <option value="">Non précisé</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe" error={errors.password}>
              <input className={inputClass} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
            </Field>
            <Field label="Confirmation" error={errors.confirm}>
              <input className={inputClass} type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </Field>
          </div>
          {formError && <FormAlert>{formError}</FormAlert>}
          <SubmitButton busy={busy}>Créer mon compte</SubmitButton>
          <p className="text-center text-xs leading-relaxed text-neutral-500">
            En créant un compte, vous acceptez notre{' '}
            <Link href="/client/confidentialite" target="_blank" className="font-medium text-neutral-800 underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </form>
      )}
      <p className="mt-8 text-center text-sm text-neutral-600">
        Déjà inscrit ?{' '}
        <Link href="/client/connexion" className="font-medium text-neutral-950 underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
