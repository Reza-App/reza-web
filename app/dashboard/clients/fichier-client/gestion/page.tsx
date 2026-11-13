'use client';

import { CLIENT_STATUS_TONES, statusTone } from '@/lib/status';
import { useState } from 'react';
import { Copy, Download, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CLIENT_STATUS_LABELS, ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconAction, RowActions, ToneButton } from '@/components/ui/actions';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, Badge, ListHeader, PageHeader, Pagination, SearchInput, Table } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { PrimaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlAction } from '@/hooks/useUrlAction';
import { useUrlState } from '@/hooks/useUrlState';
import { downloadCsv } from '@/lib/csv';
import { clientService } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, personName } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';

const PAGE_SIZE = 20;
type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

export default function ClientsPage() {
  const toast = useToast();
  const { get, set } = useUrlState();
  const [search, setSearch] = useState(get('q'));
  const term = useDebounce(search.trim(), 350);
  const status = (get('status', 'all') as StatusFilter) || 'all';
  const page = Math.max(1, Number(get('page', '1')) || 1);

  const query = useApiQuery(`clients:${term}:${status}:${page}`, (signal) =>
    clientService.list({ search: term || undefined, status, page, limit: PAGE_SIZE }, signal),
  );

  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const { can } = usePermissions();
  const canAdminClients = can('clients.admin');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  useUrlAction({ new: () => setEditing('new') });

  /** Exports every client matching the current filters (not only this page). */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await clientService.list({ search: term || undefined, status, page: 1, limit: 1000 });
      downloadCsv(
        `clients-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Prénom', 'Nom', 'Téléphone', 'Email', 'Adresse', 'Rendez vous', 'Client depuis', 'Statut'],
        all.clients.map((c) => [
          c.firstName,
          c.lastName,
          c.phone ?? '',
          c.email ?? '',
          c.address ?? '',
          c._count?.appointments ?? 0,
          formatDate(c.createdAt),
          CLIENT_STATUS_LABELS[c.status ?? 'ACTIVE'] ?? '',
        ]),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const onSearch = (value: string) => {
    setSearch(value);
    set({ q: value.trim() || null, page: null });
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await clientService.remove(deleting.id);
      toast.success('Client supprimé.');
      setDeleting(null);
      void query.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const clients = query.data?.clients ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Gestion des clients"
        description="Ajoutez, modifiez et suivez vos clients et leur historique de rendez vous."
        actions={
          <>
            <ToneButton tone="green" onClick={exportCsv} disabled={exporting || total === 0}>
              <Download size={16} /> {exporting ? 'Export...' : 'Exporter'}
            </ToneButton>
            {canAdminClients && (
              <ToneButton tone="violet" onClick={() => router.push('/dashboard/clients/fichier-client/doublons')}>
                <Copy size={16} /> Doublons
              </ToneButton>
            )}
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus size={16} /> Ajouter un client
            </PrimaryButton>
          </>
        }
      />

      <ListHeader title="Liste des clients" count={query.data ? total : undefined}>
        <Select
          aria-label="Statut"
          className="w-44"
          value={status}
          onValueChange={(v) => set({ status: v, page: null })}
        >
          <option value="all">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="INACTIVE">Inactifs</option>
        </Select>
        <SearchInput value={search} onChange={onSearch} placeholder="Rechercher un client..." />
      </ListHeader>

      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {clients.length === 0 ? (
          <EmptyState title="Aucun client" description={term ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier client.'} />
        ) : (
          <Table head={['Client', 'Contact', 'Adresse', 'RDV', 'Client depuis', 'Statut', <span key="a" className="block text-right">Actions</span>]}>
            {clients.map((client) => (
              <tr key={client.id} className="transition hover:bg-neutral-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={personName(client)} src={client.avatar} />
                    <span className="font-medium text-neutral-950">{personName(client)}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  <p>{client.phone}</p>
                  <p className="text-xs text-neutral-400">{client.email}</p>
                </td>
                <td className="max-w-56 truncate px-5 py-3 text-neutral-600">{client.address}</td>
                <td className="px-5 py-3 tabular-nums text-neutral-800">{client._count?.appointments ?? 0}</td>
                <td className="px-5 py-3 text-neutral-600">{formatDate(client.createdAt)}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone(CLIENT_STATUS_TONES, client.status ?? 'ACTIVE')}>
                    {CLIENT_STATUS_LABELS[client.status ?? 'ACTIVE'] ?? client.status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <RowActions>
                    <IconAction kind="edit" label={`Modifier ${personName(client)}`} onClick={() => setEditing(client)} />
                    {canAdminClients && (
                      <IconAction kind="delete" label={`Supprimer ${personName(client)}`} onClick={() => setDeleting(client)} />
                    )}
                  </RowActions>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={PAGE_SIZE} label="clients" onChange={(p) => set({ page: p === 1 ? null : String(p) })} />
      </QueryBoundary>

      {editing && (
        <ClientFormDialog client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => void query.refetch()} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Supprimer ${personName(deleting)} ?`}
        description="La fiche et son historique seront définitivement supprimés. Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
