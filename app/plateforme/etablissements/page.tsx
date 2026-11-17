'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Plus } from 'lucide-react';
import { NewEstablishmentDialog } from '@/components/platform/NewEstablishmentDialog';
import { PrimaryButton } from '@/components/ui/modal';
import { Badge, PageHeader, Pagination, SearchInput, Table } from '@/components/ui/page';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/api/errors';
import { type PlatformSalon, platformService } from '@/lib/api/services/platform.service';
import { formatDate, formatNumber, personName } from '@/lib/format';

const PAGE_SIZE = 20;

export default function PlatformSalonsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const term = useDebounce(search.trim(), 350);
  const [page, setPage] = useState(1);
  const [lastTerm, setLastTerm] = useState(term);
  if (lastTerm !== term) {
    setLastTerm(term);
    setPage(1);
  }

  const query = useApiQuery(`platform-salons:${term}:${page}`, (signal) =>
    platformService.salons({ q: term || undefined, page, limit: PAGE_SIZE }, signal),
  );
  const salons = query.data?.salons ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<PlatformSalon | null>(null);
  const [creating, setCreating] = useState(false);

  const patchSalon = (id: string, patch: Partial<PlatformSalon>) =>
    query.setData((d) => d && { ...d, salons: d.salons.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const toggleFeatured = async (salon: PlatformSalon) => {
    setBusyId(salon.id);
    try {
      const next = !salon.featured;
      await platformService.setFeatured(salon.id, next);
      patchSalon(salon.id, { featured: next });
      toast.success(next ? `${salon.name} est mis en avant.` : `${salon.name} n'est plus mis en avant.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const toggleAccount = async () => {
    const salon = toggling;
    if (!salon?.account) return;
    setBusyId(salon.id);
    try {
      const next = !salon.account.isActive;
      await platformService.setAccountActive(salon.account.id, next);
      toast.success(next ? 'Compte réactivé.' : 'Compte désactivé : ses établissements sont masqués aux clients.');
      setToggling(null);
      await query.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Établissements"
        description="Tous les établissements inscrits sur Selia, leur activité et leur visibilité."
        actions={
          <PrimaryButton onClick={() => setCreating(true)}>
            <Plus size={16} /> Créer un établissement
          </PrimaryButton>
        }
      />
      {creating && <NewEstablishmentDialog onClose={() => setCreating(false)} onCreated={() => void query.refetch()} />}

      <div className="mb-5 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Nom, ville ou email du propriétaire" />
      </div>

      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {salons.length === 0 ? (
          <EmptyState title="Aucun établissement" description={term ? 'Aucun établissement ne correspond à cette recherche.' : undefined} />
        ) : (
          <Table head={['Établissement', 'Propriétaire', 'Clients', 'RDV', 'Inscrit le', 'Visibilité', 'Mis en avant', 'Compte', <span key="a" className="block text-right">Actions</span>]}>
            {salons.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3">
                  {s.account ? (
                    <Link href={`/plateforme/etablissements/${encodeURIComponent(s.account.id)}`} className="font-medium text-neutral-950 hover:underline">
                      {s.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-neutral-950">{s.name}</p>
                  )}
                  <p className="text-xs text-neutral-500">{s.city || 'Ville non renseignée'}</p>
                </td>
                <td className="px-5 py-3">
                  <p className="text-neutral-800">{personName(s.account?.owner) || '-'}</p>
                  <p className="text-xs text-neutral-500">{s.account?.owner?.email}</p>
                </td>
                <td className="px-5 py-3 tabular-nums">{formatNumber(s.clientCount)}</td>
                <td className="px-5 py-3 tabular-nums">{formatNumber(s.appointmentCount)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-600">{formatDate(s.createdAt)}</td>
                <td className="px-5 py-3">
                  <Badge tone={s.subscriptionActive ? 'green' : 'amber'}>{s.subscriptionActive ? 'Visible' : 'Masqué'}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Switch checked={s.featured} disabled={busyId === s.id} onChange={() => void toggleFeatured(s)} label={`Mettre ${s.name} en avant`} />
                </td>
                <td className="px-5 py-3">
                  {s.account ? (
                    <button
                      type="button"
                      onClick={() => setToggling(s)}
                      disabled={busyId === s.id}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        s.account.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {s.account.isActive ? 'Actif' : 'Désactivé'}
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-400">Sans compte</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {s.account && (
                    <Link
                      href={`/plateforme/etablissements/${encodeURIComponent(s.account.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-neutral-950 hover:text-white"
                    >
                      <Eye size={14} /> Ouvrir
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination
          page={page}
          totalPages={query.data?.pagination.totalPages ?? 1}
          total={query.data?.pagination.total}
          pageSize={PAGE_SIZE}
          label="établissements"
          onChange={setPage}
        />
      </QueryBoundary>

      <ConfirmDialog
        open={!!toggling}
        title={toggling?.account?.isActive ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
        description={
          toggling?.account?.isActive
            ? `Tous les établissements du compte de ${toggling ? personName(toggling.account?.owner) : ''} seront masqués aux clients et ne pourront plus recevoir de réservations.`
            : 'Les établissements du compte redeviendront visibles et réservables.'
        }
        confirmLabel={toggling?.account?.isActive ? 'Désactiver' : 'Réactiver'}
        destructive={!!toggling?.account?.isActive}
        busy={!!busyId}
        onConfirm={() => void toggleAccount()}
        onCancel={() => setToggling(null)}
      />
    </div>
  );
}
