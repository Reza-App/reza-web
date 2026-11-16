'use client';

import { useState } from 'react';
import { KeyRound, Plus, UserRound, Users } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, Table } from '@/components/ui/page';
import { Switch } from '@/components/ui/switch';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { adminPasswordError, platformService } from '@/lib/api/services/platform.service';
import { formatDate, personName } from '@/lib/format';
import { isValidEmail } from '@/lib/validation';

function ProfileCard() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', email: user?.email ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Le prénom et le nom sont requis.');
    if (!isValidEmail(form.email)) return setError('Adresse email invalide.');
    setBusy(true);
    setError(null);
    try {
      await platformService.updateMe(form);
      await refresh();
      toast.success('Profil enregistré.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Mon profil">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prénom">
            <input className={fieldClass} value={form.firstName} onChange={set('firstName')} />
          </FormField>
          <FormField label="Nom">
            <input className={fieldClass} value={form.lastName} onChange={set('lastName')} />
          </FormField>
        </div>
        <FormField label="Email de connexion" hint="Utilisez une adresse que vous consultez : elle sert à vous identifier.">
          <input className={fieldClass} type="email" value={form.email} onChange={set('email')} />
        </FormField>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end">
          <PrimaryButton onClick={save} busy={busy}>
            <UserRound size={16} /> Enregistrer
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!current) return setError('Saisissez votre mot de passe actuel.');
    const weak = adminPasswordError(next);
    if (weak) return setError(weak);
    if (next !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setBusy(true);
    setError(null);
    try {
      await platformService.changeMyPassword({ currentPassword: current, newPassword: next });
      toast.success('Mot de passe changé. Reconnectez vous avec le nouveau.');
      await logout();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Card title="Mot de passe">
      <div className="space-y-4">
        <FormField label="Mot de passe actuel">
          <input className={fieldClass} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </FormField>
        <FormField label="Nouveau mot de passe" hint="Au moins 10 caractères, avec des lettres et des chiffres.">
          <input className={fieldClass} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </FormField>
        <FormField label="Confirmation">
          <input className={fieldClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </FormField>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <p className="text-xs text-neutral-500">Vos autres sessions ouvertes seront déconnectées.</p>
        <div className="flex justify-end">
          <PrimaryButton onClick={save} busy={busy}>
            <KeyRound size={16} /> Changer le mot de passe
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

function NewAdminDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Le prénom et le nom sont requis.');
    if (!isValidEmail(form.email)) return setError('Adresse email invalide.');
    const weak = adminPasswordError(form.password);
    if (weak) return setError(`Mot de passe provisoire : ${weak.toLowerCase()}`);
    setBusy(true);
    setError(null);
    try {
      await platformService.createAdmin(form);
      toast.success('Administrateur ajouté. Transmettez lui son mot de passe provisoire.');
      onDone();
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
      title="Ajouter un administrateur"
      onClose={onClose}
      busy={busy}
      error={error}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={save} busy={busy}>
            Ajouter
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prénom">
            <input className={fieldClass} value={form.firstName} onChange={set('firstName')} autoFocus />
          </FormField>
          <FormField label="Nom">
            <input className={fieldClass} value={form.lastName} onChange={set('lastName')} />
          </FormField>
        </div>
        <FormField label="Email">
          <input className={fieldClass} type="email" value={form.email} onChange={set('email')} autoComplete="off" />
        </FormField>
        <FormField label="Mot de passe provisoire" hint="Il pourra le changer depuis cette page.">
          <input className={fieldClass} type="text" value={form.password} onChange={set('password')} autoComplete="off" />
        </FormField>
      </div>
    </Modal>
  );
}

function AdminsCard() {
  const toast = useToast();
  const { user } = useAuth();
  const query = useApiQuery('platform-admins', (signal) => platformService.admins(signal));
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (id: string, isActive: boolean) => {
    setBusyId(id);
    try {
      await platformService.setAdminActive(id, isActive);
      toast.success(isActive ? 'Administrateur réactivé.' : 'Administrateur suspendu.');
      await query.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card
      title="Administrateurs Selia"
      actions={
        <SecondaryButton onClick={() => setAdding(true)}>
          <Plus size={16} /> Ajouter
        </SecondaryButton>
      }
    >
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        <Table head={['Administrateur', 'Ajouté le', 'Actif']}>
          {(query.data ?? []).map((a) => (
            <tr key={a.id}>
              <td className="px-5 py-3">
                <p className="font-medium text-neutral-950">
                  {personName(a)} {a.id === user?.id && <Badge tone="muted">Vous</Badge>}
                </p>
                <p className="text-xs text-neutral-500">{a.email}</p>
              </td>
              <td className="px-5 py-3 text-neutral-600">{formatDate(a.createdAt)}</td>
              <td className="px-5 py-3">
                <Switch
                  checked={a.isActive}
                  disabled={a.id === user?.id || busyId === a.id}
                  label={`${personName(a)} actif`}
                  onChange={(isActive) => void toggle(a.id, isActive)}
                />
              </td>
            </tr>
          ))}
        </Table>
      </QueryBoundary>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
        <Users size={13} /> Un administrateur suspendu ne peut plus se connecter. Il reste toujours au moins un administrateur actif.
      </p>
      {adding && <NewAdminDialog onClose={() => setAdding(false)} onDone={() => void query.refetch()} />}
    </Card>
  );
}

export default function PlatformAccountSettingsPage() {
  return (
    <div>
      <PageHeader title="Compte et administrateurs" description="Votre profil, votre mot de passe et l'équipe qui administre Selia." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard />
          <PasswordCard />
        </div>
        <AdminsCard />
      </div>
    </div>
  );
}
