'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api/errors';
import { type CreatedEstablishment, platformService } from '@/lib/api/services/platform.service';
import { formatDate } from '@/lib/format';
import { durationLabel, type Plan, PLAN_DURATIONS, PLAN_LABELS, PLAN_PITCH } from '@/lib/plans';
import { errorSummary, type FieldErrors, hasErrors, isValidEmail, isValidPhone, messages, normalizePhone, validate } from '@/lib/validation';

const OFFERS = [0, 1, 2, 3, 6];

type Field = 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'salonEmail';
const LABELS: Record<Field, string> = {
  name: "Nom de l'établissement",
  firstName: 'Prénom du gérant',
  lastName: 'Nom du gérant',
  email: 'Email du gérant',
  phone: 'Téléphone du gérant',
  salonEmail: "Email de l'établissement",
};

const EMPTY = { name: '', city: '', address: '', salonPhone: '', salonEmail: '', category: '', firstName: '', lastName: '', email: '', phone: '' };

/**
 * The Selia administrator opens an establishment for an owner: salon, owner
 * account and plan. The owner receives a link to choose a password.
 */
export function NewEstablishmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [plan, setPlan] = useState<Plan>('SALON');
  const [months, setMonths] = useState(1);
  const [offered, setOffered] = useState(0);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedEstablishment | null>(null);
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    const found = validate<Field>({
      name: () => (form.name.trim().length < 2 ? messages.required : null),
      firstName: () => (!form.firstName.trim() ? messages.required : null),
      lastName: () => (!form.lastName.trim() ? messages.required : null),
      email: () => (!form.email.trim() ? messages.required : !isValidEmail(form.email) ? messages.email : null),
      phone: () => (!form.phone.trim() ? messages.required : !isValidPhone(form.phone) ? messages.phone : null),
      salonEmail: () => (form.salonEmail.trim() && !isValidEmail(form.salonEmail) ? messages.email : null),
    });
    setErrors(found);
    setError(errorSummary(found, LABELS));
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      const result = await platformService.createEstablishment({
        owner: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), phone: normalizePhone(form.phone) },
        salon: {
          name: form.name.trim(),
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.salonPhone.trim() ? normalizePhone(form.salonPhone) : undefined,
          email: form.salonEmail.trim() || undefined,
          category: form.category.trim() || undefined,
        },
        plan,
        months,
        offeredMonths: offered,
      });
      setCreated(result);
      onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Lien copié.');
    } catch {
      toast.error('Copie impossible, sélectionnez le lien à la main.');
    }
  };

  if (created) {
    return (
      <Modal
        open
        title="Établissement créé"
        onClose={onClose}
        footer={
          <>
            <SecondaryButton onClick={onClose}>Fermer</SecondaryButton>
            <Link href={`/plateforme/etablissements/${created.accountId}`} className="inline-flex items-center rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
              Ouvrir la fiche
            </Link>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="flex items-start gap-2 text-neutral-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>
              <span className="font-medium">{created.salon.name}</span> est créé. {created.emailSent ? `Un email a été envoyé à ${created.owner.email} pour choisir son mot de passe.` : "L'email n'a pas pu être envoyé : transmettez le lien ci dessous au gérant."}
            </span>
          </p>
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-neutral-500">Lien pour choisir le mot de passe</p>
            <p className="break-all font-mono text-xs text-neutral-800">{created.inviteUrl}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-500">Valable jusqu&apos;au {formatDate(created.inviteExpires)}</span>
              <button type="button" onClick={() => void copy(created.inviteUrl)} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50">
                <Copy size={12} /> Copier
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      size="lg"
      title="Créer un établissement"
      onClose={onClose}
      busy={busy}
      error={error}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Créer l&apos;établissement
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-medium text-neutral-950">Établissement</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nom" error={errors.name} className="sm:col-span-2">
              <input className={fieldClass} maxLength={100} value={form.name} onChange={set('name')} autoFocus />
            </FormField>
            <FormField label="Ville">
              <input className={fieldClass} maxLength={60} value={form.city} onChange={set('city')} />
            </FormField>
            <FormField label="Adresse">
              <input className={fieldClass} maxLength={200} value={form.address} onChange={set('address')} />
            </FormField>
            <FormField label="Téléphone (facultatif)" hint="Sinon, celui du gérant.">
              <input className={fieldClass} type="tel" value={form.salonPhone} onChange={set('salonPhone')} />
            </FormField>
            <FormField label="Email (facultatif)" error={errors.salonEmail} hint="Sinon, celui du gérant.">
              <input className={fieldClass} type="email" value={form.salonEmail} onChange={set('salonEmail')} />
            </FormField>
            <FormField label="Catégories (facultatif)" hint="Séparées par des virgules : Coiffeur, Barbier." className="sm:col-span-2">
              <input className={fieldClass} maxLength={200} value={form.category} onChange={set('category')} />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium text-neutral-950">Gérant</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prénom" error={errors.firstName}>
              <input className={fieldClass} maxLength={60} value={form.firstName} onChange={set('firstName')} />
            </FormField>
            <FormField label="Nom" error={errors.lastName}>
              <input className={fieldClass} maxLength={60} value={form.lastName} onChange={set('lastName')} />
            </FormField>
            <FormField label="Email" error={errors.email} hint="Son identifiant de connexion.">
              <input className={fieldClass} type="email" value={form.email} onChange={set('email')} />
            </FormField>
            <FormField label="Téléphone" error={errors.phone}>
              <input className={fieldClass} type="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={set('phone')} />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium text-neutral-950">Abonnement</h3>
          <div className="mb-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
            {(['SALON', 'FREELANCE'] as Plan[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                onClick={() => {
                  setPlan(p);
                  if (!PLAN_DURATIONS[p].includes(months)) setMonths(PLAN_DURATIONS[p][0]!);
                }}
                className={`rounded-2xl border p-4 text-left transition ${plan === p ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 hover:border-neutral-400'}`}
              >
                <span className="block font-medium">Plan {PLAN_LABELS[p]}</span>
                <span className={`mt-1 block text-xs ${plan === p ? 'text-white/75' : 'text-neutral-500'}`}>{PLAN_PITCH[p]}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Durée des périodes" hint="Proposée au gérant pour son premier paiement.">
              <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))} aria-label="Durée des périodes">
                {PLAN_DURATIONS[plan].map((m) => (
                  <option key={m} value={String(m)}>
                    {durationLabel(m)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Période offerte" hint="Le salon est publié tout de suite, sans virement.">
              <Select value={String(offered)} onValueChange={(v) => setOffered(Number(v))} aria-label="Période offerte">
                {OFFERS.map((m) => (
                  <option key={m} value={String(m)}>
                    {m === 0 ? 'Aucune : publié après le premier virement' : `${durationLabel(m)} offert${m > 1 ? 's' : ''}`}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>
      </div>
    </Modal>
  );
}
