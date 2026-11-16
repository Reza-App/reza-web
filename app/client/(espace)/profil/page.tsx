'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, ChevronRight, Heart, LogOut, ShieldCheck, Star, Trash2, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Card, PageHeader } from '@/components/ui/page';
import { LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { type ClientProfile, type ClientReview, clientAccount } from '@/lib/api/services/clientArea.service';
import { formatDate } from '@/lib/format';
import { CLIENT_PASSWORD_MIN_LENGTH, isValidPhone, normalizePhone } from '@/lib/validation';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function ProfileForm({ client }: { client: ClientProfile }) {
  const toast = useToast();
  const { refresh } = useClientAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: client.firstName ?? '',
    lastName: client.lastName ?? '',
    phone: client.phone ?? '',
    gender: client.gender ?? '',
    dateOfBirth: client.dateOfBirth ? client.dateOfBirth.slice(0, 10) : '',
  });
  const [avatar, setAvatar] = useState(client.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('Le prénom et le nom sont requis.');
    if (form.phone.trim() && !isValidPhone(form.phone)) return toast.error('Téléphone invalide : +212XXXXXXXXX ou 0XXXXXXXXX.');
    setBusy(true);
    try {
      await clientAccount.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() ? normalizePhone(form.phone) : undefined,
        gender: (form.gender || null) as ClientProfile['gender'],
        dateOfBirth: form.dateOfBirth || null,
      });
      await refresh();
      toast.success('Profil enregistré.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast.error('Formats acceptés : JPG, PNG ou WEBP.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image trop lourde (5 Mo maximum).');
    setUploading(true);
    try {
      const url = await clientAccount.uploadAvatar(file);
      await clientAccount.updateProfile({ avatar: url });
      setAvatar(url);
      await refresh();
      toast.success('Photo mise à jour.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card title="Mes informations">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          {avatar ? (
            <Image src={avatar} alt="" width={72} height={72} unoptimized className="h-18 w-18 rounded-full object-cover" />
          ) : (
            <span className="flex h-18 w-18 items-center justify-center rounded-full bg-neutral-950 text-lg font-semibold text-white">
              {(form.firstName[0] ?? '') + (form.lastName[0] ?? '')}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 rounded-full border border-neutral-200 bg-white p-2 text-neutral-800 shadow-sm hover:bg-neutral-50"
            aria-label="Changer la photo"
          >
            <Camera size={14} />
          </button>
          <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} hidden onChange={(e) => void upload(e.target.files?.[0])} />
        </div>
        <div>
          <p className="font-medium text-neutral-950">{client.email}</p>
          {client.memberSince && <p className="text-sm text-neutral-500">Membre depuis le {formatDate(client.memberSince)}</p>}
          {uploading && <p className="text-xs text-neutral-500">Envoi de la photo...</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Prénom">
          <input className={fieldClass} value={form.firstName} onChange={set('firstName')} />
        </FormField>
        <FormField label="Nom">
          <input className={fieldClass} value={form.lastName} onChange={set('lastName')} />
        </FormField>
        <FormField label="Téléphone">
          <input className={fieldClass} type="tel" value={form.phone} onChange={set('phone')} />
        </FormField>
        <FormField label="Date de naissance">
          <input className={fieldClass} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Genre">
          <Select value={form.gender} onValueChange={(gender) => setForm((f) => ({ ...f, gender }))} aria-label="Genre">
            <option value="">Non précisé</option>
            <option value="female">Femme</option>
            <option value="male">Homme</option>
          </Select>
        </FormField>
      </div>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={() => void save()} busy={busy}>
          Enregistrer
        </PrimaryButton>
      </div>
    </Card>
  );
}

/** Same two steps as the app: current password then a code sent by email. */
function PasswordCard() {
  const toast = useToast();
  const [step, setStep] = useState<'current' | 'code'>('current');
  const [current, setCurrent] = useState('');
  const [code, setCode] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!current) return toast.error('Saisissez votre mot de passe actuel.');
    setBusy(true);
    try {
      const r = await clientAccount.sendPasswordCode(current);
      toast.success(r.message ?? 'Un code vous a été envoyé par email.');
      setStep('code');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    if (!/^\d{6}$/.test(code)) return toast.error('Le code contient 6 chiffres.');
    if (next.length < CLIENT_PASSWORD_MIN_LENGTH) return toast.error(`Au moins ${CLIENT_PASSWORD_MIN_LENGTH} caractères.`);
    setBusy(true);
    try {
      await clientAccount.changePassword({ code, newPassword: next });
      toast.success('Mot de passe modifié.');
      setStep('current');
      setCurrent('');
      setCode('');
      setNext('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Mot de passe">
      {step === 'current' ? (
        <div className="space-y-4">
          <FormField label="Mot de passe actuel">
            <input className={fieldClass} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </FormField>
          <div className="flex justify-end">
            <SecondaryButton onClick={() => void sendCode()} disabled={busy}>
              Recevoir un code
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Code reçu par email">
            <input className={`${fieldClass} tracking-[0.3em]`} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </FormField>
          <FormField label="Nouveau mot de passe">
            <input className={fieldClass} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setStep('current')} disabled={busy}>
              Retour
            </SecondaryButton>
            <PrimaryButton onClick={() => void change()} busy={busy}>
              Changer
            </PrimaryButton>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReviewsCard({ email }: { email: string }) {
  const toast = useToast();
  const query = useApiQuery('client-reviews', (signal) => clientAccount.reviews(signal));
  const [deleting, setDeleting] = useState<ClientReview | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await clientAccount.removeReview(deleting.id, email);
      query.setData((list) => list?.filter((r) => r.id !== deleting.id));
      toast.success('Avis supprimé.');
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Mes avis">
      {(query.data ?? []).length === 0 ? (
        <p className="text-sm text-neutral-500">{query.loading ? 'Chargement...' : "Vous n'avez pas encore laissé d'avis."}</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto">
          {query.data!.map((r) => (
            <li key={r.id} className="rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-950">{r.salon}</p>
                  <span className="mt-1 flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={13} className={i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
                    ))}
                  </span>
                </div>
                <button type="button" onClick={() => setDeleting(r)} className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer l'avis">
                  <Trash2 size={15} />
                </button>
              </div>
              {r.comment && <p className="mt-2 text-sm text-neutral-700">{r.comment}</p>}
              <p className="mt-1 text-xs text-neutral-400">{r.date}</p>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cet avis ?"
        description="Il ne sera plus visible sur la page du salon."
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}

export default function ClientProfilePage() {
  const { status, client, logout } = useClientAuth();
  if (status !== 'authenticated' || !client) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Mon compte" description="Vos informations, vos proches et votre sécurité." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <ProfileForm key={client.id} client={client} />
          <PasswordCard />
        </div>
        <div className="space-y-6">
          <Card title="Raccourcis">
            <ul className="divide-y divide-neutral-100">
              {[
                { href: '/client/proches', label: 'Mes proches', icon: Users },
                { href: '/client/favoris', label: 'Mes favoris', icon: Heart },
                { href: '/client/confidentialite', label: 'Politique de confidentialité', icon: ShieldCheck },
              ].map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center justify-between py-3 text-sm text-neutral-800 hover:text-neutral-950">
                    <span className="flex items-center gap-3">
                      <Icon size={16} /> {label}
                    </span>
                    <ChevronRight size={16} className="text-neutral-400" />
                  </Link>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 py-3 text-sm text-red-700 hover:text-red-800">
                  <LogOut size={16} /> Se déconnecter
                </button>
              </li>
            </ul>
          </Card>
          <ReviewsCard email={client.email} />
        </div>
      </div>
    </div>
  );
}
