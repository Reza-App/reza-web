'use client';

import { useState } from 'react';
import { KeyRound, MailCheck, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge, PageHeader, Pagination, SearchInput, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/api/errors';
import { type ClientAction, type PlatformClient, platformService } from '@/lib/api/services/platform.service';
import { formatDate, formatNumber, personName } from '@/lib/format';

const PAGE_SIZE = 20;

const CONFIRM: Record<ClientAction, { title: string; text: string; label: string; done: string; destructive?: boolean }> = {
  suspend: {
    title: 'Suspendre ce compte ?',
    text: 'Le client ne pourra plus se connecter ni réserver en ligne. Ses rendez vous restent dans les agendas des salons.',
    label: 'Suspendre',
    done: 'Compte suspendu.',
    destructive: true,
  },
  restore: { title: 'Rétablir ce compte ?', text: 'Le client pourra de nouveau se connecter.', label: 'Rétablir', done: 'Compte rétabli.' },
  'confirm-email': {
    title: "Confirmer l'email à la main ?",
    text: "À faire quand le client n'a pas reçu le lien de confirmation et que vous avez vérifié son identité.",
    label: 'Confirmer',
    done: 'Email confirmé : le client peut se connecter.',
  },
  'reset-password': {
    title: 'Envoyer un lien de réinitialisation ?',
    text: 'Le client reçoit, à sa propre adresse, un lien pour choisir un nouveau mot de passe.',
    label: 'Envoyer',
    done: 'Lien de réinitialisation envoyé.',
  },
  anonymize: {
    title: 'Supprimer les données de ce client ?',
    text: 'Demande de suppression : nom, email, téléphone, photo, favoris et proches sont effacés et le compte est fermé. Les rendez vous et factures restent dans les salons, sans nom. Action définitive.',
    label: 'Supprimer les données',
    done: 'Données supprimées.',
    destructive: true,
  },
};

export default function PlatformClientsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const term = useDebounce(search.trim(), 350);
  const [page, setPage] = useState(1);
  const query = useApiQuery(`platform-clients:${term}:${page}`, (signal) => platformService.clients({ q: term || undefined, page }, signal));
  const clients = query.data?.clients ?? [];
  const [pending, setPending] = useState<{ client: PlatformClient; action: ClientAction } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await platformService.clientAction(pending.client.id, pending.action);
      toast.success(CONFIRM[pending.action].done);
      setPending(null);
      await query.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const ask = (client: PlatformClient, action: ClientAction) => setPending({ client, action });

  return (
    <div>
      <PageHeader title="Clients" description="Comptes créés sur l'application et l'espace client, pour le support." />
      <div className="mb-5 max-w-md">
        <SearchInput
          fill
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Nom, email ou téléphone"
        />
      </div>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {clients.length === 0 ? (
          <EmptyState title="Aucun compte client" description={term ? 'Aucun compte ne correspond à cette recherche.' : undefined} />
        ) : (
          <Table head={['Client', 'Inscrit le', 'RDV', 'Avis', 'État', <span key="a" className="block text-right">Actions</span>]}>
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-neutral-950">{personName(c)}</p>
                  <p className="text-xs text-neutral-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDate(c.createdAt)}</td>
                <td className="px-5 py-3 tabular-nums">{formatNumber(c.appointments)}</td>
                <td className="px-5 py-3 tabular-nums">{formatNumber(c.reviews)}</td>
                <td className="px-5 py-3">
                  {c.suspendedAt ? (
                    <Badge tone="red">{c.email ? 'Suspendu' : 'Données supprimées'}</Badge>
                  ) : c.emailVerified ? (
                    <Badge tone="green">Actif</Badge>
                  ) : (
                    <Badge tone="amber">Email non confirmé</Badge>
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.email && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!c.emailVerified && (
                        <button type="button" onClick={() => ask(c, 'confirm-email')} title="Confirmer l'email" aria-label={`Confirmer l'email de ${personName(c)}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950">
                          <MailCheck size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => ask(c, 'reset-password')} title="Envoyer un lien de réinitialisation" aria-label={`Réinitialiser le mot de passe de ${personName(c)}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950">
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => ask(c, c.suspendedAt ? 'restore' : 'suspend')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${c.suspendedAt ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                      >
                        {c.suspendedAt ? 'Rétablir' : 'Suspendre'}
                      </button>
                      <button type="button" onClick={() => ask(c, 'anonymize')} title="Supprimer les données" aria-label={`Supprimer les données de ${personName(c)}`} className="rounded-full p-2 text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={PAGE_SIZE} label="comptes" onChange={setPage} />
      </QueryBoundary>
      <ConfirmDialog
        open={!!pending}
        title={pending ? CONFIRM[pending.action].title : ''}
        description={pending ? `${personName(pending.client)} (${pending.client.email}). ${CONFIRM[pending.action].text}` : ''}
        confirmLabel={pending ? CONFIRM[pending.action].label : ''}
        destructive={!!pending && !!CONFIRM[pending.action].destructive}
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
