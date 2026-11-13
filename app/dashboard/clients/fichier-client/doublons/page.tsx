'use client';

import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Avatar, Badge, Card, PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { clientService, type DuplicateGroup } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, personName } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';

function ClientOption({
  client,
  reason,
  checked,
  onSelect,
  name,
}: {
  client: Client;
  reason?: string;
  checked: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
        checked ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-4 w-4 accent-neutral-950" />
      <Avatar name={personName(client)} src={client.avatar} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-neutral-950">{personName(client)}</p>
        <p className="truncate text-xs text-neutral-500">{[client.phone, client.email].filter(Boolean).join(' · ')}</p>
        <p className="text-xs text-neutral-400">
          Créé le {formatDate(client.createdAt)} · {client._count?.appointments ?? 0} RDV
        </p>
      </div>
      {reason && <Badge tone="muted">{reason}</Badge>}
    </label>
  );
}

function DuplicateCard({ group, onMerged }: { group: DuplicateGroup; onMerged: () => void }) {
  const toast = useToast();
  const members: (Client & { reason?: string })[] = [group, ...group.duplicates];
  const [primaryId, setPrimaryId] = useState(group.id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const primary = members.find((m) => m.id === primaryId)!;

  const merge = async () => {
    setBusy(true);
    try {
      await clientService.merge(
        primaryId,
        members.filter((m) => m.id !== primaryId).map((m) => m.id),
      );
      toast.success('Fiches fusionnées.');
      setConfirm(false);
      onMerged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={`${members.length} fiches similaires`}
      actions={
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <GitMerge size={15} /> Fusionner
        </button>
      }
    >
      <p className="mb-3 text-sm text-neutral-500">Choisissez la fiche à conserver. Les rendez vous, factures et avis des autres fiches y seront rattachés.</p>
      <div className="space-y-2">
        {members.map((m) => (
          <ClientOption key={m.id} client={m} reason={m.reason} checked={m.id === primaryId} onSelect={() => setPrimaryId(m.id)} name={`primary-${group.id}`} />
        ))}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Fusionner ces fiches ?"
        description={`La fiche de ${personName(primary)} sera conservée, les ${members.length - 1} autres seront supprimées après transfert de leur historique.`}
        confirmLabel="Fusionner"
        busy={busy}
        onConfirm={merge}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}

export default function DuplicatesPage() {
  const query = useApiQuery('client-duplicates', (signal) => clientService.duplicates(signal));
  const groups = query.data?.duplicates ?? [];

  return (
    <div>
      <PageHeader
        title="Doublons"
        description="Fiches qui semblent correspondre à la même personne (email ou téléphone identique, noms proches)."
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {groups.length === 0 ? (
          <EmptyState title="Aucun doublon détecté" description="Votre fichier client est propre." />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {groups.map((group) => (
              <DuplicateCard key={group.id} group={group} onMerged={query.refetch} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
