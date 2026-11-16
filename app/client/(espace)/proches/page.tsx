'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { IconAction, RowActions } from '@/components/ui/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { clientAccount, type FamilyMember } from '@/lib/api/services/clientArea.service';
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/validation';

const RELATIONSHIPS = ['Enfant', 'Conjoint(e)', 'Parent', 'Frère / sœur', 'Ami(e)', 'Autre'];

type Draft = { firstName: string; lastName: string; relationship: string; phone: string; email: string; gender: '' | 'male' | 'female' };
const EMPTY: Draft = { firstName: '', lastName: '', relationship: RELATIONSHIPS[0]!, phone: '', email: '', gender: '' };

/** Relatives the client can book for (« Pour qui ? » in the booking flow). */
export default function ClientRelativesPage() {
  const toast = useToast();
  const { client } = useClientAuth();
  const query = useApiQuery('client-family', (signal) => clientAccount.family(signal));
  const [editing, setEditing] = useState<FamilyMember | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleting, setDeleting] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (member: FamilyMember | 'new') => {
    setEditing(member);
    setError(null);
    setDraft(
      member === 'new'
        ? EMPTY
        : {
            firstName: member.firstName,
            lastName: member.lastName ?? '',
            relationship: member.relationship,
            phone: member.phone ?? '',
            email: member.email ?? '',
            gender: member.gender ?? '',
          },
    );
  };

  const save = async () => {
    if (!client || !editing) return;
    if (!draft.firstName.trim()) return setError('Le prénom est requis.');
    if (draft.phone.trim() && !isValidPhone(draft.phone)) return setError('Téléphone invalide : +212XXXXXXXXX ou 0XXXXXXXXX.');
    if (draft.email.trim() && !isValidEmail(draft.email)) return setError('Adresse email invalide.');
    setBusy(true);
    setError(null);
    const input = {
      clientEmail: client.email,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      relationship: draft.relationship,
      phone: draft.phone.trim() ? normalizePhone(draft.phone) : undefined,
      email: draft.email.trim() || undefined,
      gender: draft.gender || undefined,
    };
    try {
      if (editing === 'new') await clientAccount.addFamily(input);
      else await clientAccount.updateFamily(editing.id, input);
      toast.success(editing === 'new' ? 'Proche ajouté.' : 'Proche modifié.');
      setEditing(null);
      await query.refetch();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await clientAccount.removeFamily(deleting.id);
      toast.success('Proche supprimé.');
      setDeleting(null);
      await query.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Mes proches"
        description="Réservez pour vos enfants, votre conjoint ou vos amis sans ressaisir leurs informations."
        actions={
          <PrimaryButton onClick={() => open('new')}>
            <Plus size={16} /> Ajouter un proche
          </PrimaryButton>
        }
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {(query.data ?? []).length === 0 ? (
          <EmptyState title="Aucun proche" description="Ajoutez un proche pour réserver à sa place." />
        ) : (
          <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data!.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 rounded-3xl border border-neutral-200 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
                    {m.firstName[0]}
                    {m.lastName?.[0] ?? ''}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-950">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="truncate text-sm text-neutral-500">{[m.relationship, m.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <RowActions>
                  <IconAction kind="edit" label={`Modifier ${m.firstName}`} onClick={() => open(m)} />
                  <IconAction kind="delete" label={`Supprimer ${m.firstName}`} onClick={() => setDeleting(m)} />
                </RowActions>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <Modal
        open={!!editing}
        title={editing === 'new' ? 'Ajouter un proche' : 'Modifier le proche'}
        busy={busy}
        onClose={() => setEditing(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setEditing(null)} disabled={busy}>
              Annuler
            </SecondaryButton>
            <PrimaryButton onClick={() => void save()} busy={busy}>
              Enregistrer
            </PrimaryButton>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
          <FormField label="Prénom">
            <input className={fieldClass} value={draft.firstName} onChange={set('firstName')} />
          </FormField>
          <FormField label="Nom (facultatif)">
            <input className={fieldClass} value={draft.lastName} onChange={set('lastName')} />
          </FormField>
          <FormField label="Lien">
            <Select value={draft.relationship} onValueChange={(relationship) => setDraft((d) => ({ ...d, relationship }))} aria-label="Lien">
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Genre (facultatif)">
            <Select value={draft.gender} onValueChange={(gender) => setDraft((d) => ({ ...d, gender: gender as Draft['gender'] }))} aria-label="Genre">
              <option value="">Non précisé</option>
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </Select>
          </FormField>
          <FormField label="Téléphone (facultatif)">
            <input className={fieldClass} type="tel" value={draft.phone} onChange={set('phone')} />
          </FormField>
          <FormField label="Email (facultatif)">
            <input className={fieldClass} type="email" value={draft.email} onChange={set('email')} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer ce proche ?"
        description={deleting ? `${deleting.firstName} ne sera plus proposé lors de vos réservations. Ses rendez vous existants sont conservés.` : ''}
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
