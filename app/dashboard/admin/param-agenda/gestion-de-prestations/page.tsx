'use client';

import { useMemo, useState } from 'react';
import { Plus, Tags, X } from 'lucide-react';
import { ServiceFormDialog, VISIBILITY_LABELS } from '@/components/admin/ServiceFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, PageHeader, SearchInput, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useEmployees, useServices, referenceKeys } from '@/hooks/useReferenceData';
import { useAuth } from '@/contexts/AuthContext';
import { invalidate } from '@/lib/api/memo';
import { serviceCatalog } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDuration, formatMoney } from '@/lib/format';
import type { Service } from '@/lib/types/catalog';
import { IconAction, ToneButton } from '@/components/ui/actions';
import { useUrlAction } from '@/hooks/useUrlAction';

function priceLabel(s: Service) {
  if (s.onQuote) return 'Sur devis';
  if (s.priceType === 'FROM') return `Dès ${formatMoney(s.priceFrom ?? s.price)}`;
  if (s.priceType === 'RANGE') return `${formatMoney(s.priceFrom)} à ${formatMoney(s.priceTo)}`;
  return formatMoney(s.price);
}

function CategoriesDialog({ categories, onClose, onSaved }: { categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [list, setList] = useState(categories);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await serviceCatalog.setCategories(list);
      toast.success('Catégories enregistrées.');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      backLabel="Retour aux prestations"
      open
      size="sm"
      title="Catégories"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={save} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <ul className="mb-4 space-y-2">
        {list.map((c) => (
          <li key={c} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-2 text-sm">
            {c}
            <button type="button" onClick={() => setList((l) => l.filter((x) => x !== c))} aria-label={`Retirer ${c}`} className="text-neutral-400 hover:text-neutral-950">
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = name.trim();
          if (value && !list.some((c) => c.toLowerCase() === value.toLowerCase())) setList((l) => [...l, value]);
          setName('');
        }}
      >
        <input className={fieldClass} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" />
        <SecondaryButton type="submit">
          <Plus size={15} />
        </SecondaryButton>
      </form>
    </Modal>
  );
}

export default function ServicesPage() {
  const toast = useToast();
  const { activeSalon } = useAuth();
  const services = useServices();
  const { data: employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  useUrlAction({ new: () => setEditing('new') });
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    if (activeSalon) invalidate(referenceKeys.services(activeSalon.id));
    void services.refetch();
  };

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (services.data?.services ?? []).filter((s) => !term || s.name.toLowerCase().includes(term));
    const map = new Map<string, Service[]>();
    for (const s of list) map.set(s.category || 'Sans catégorie', [...(map.get(s.category || 'Sans catégorie') ?? []), s]);
    return [...map.entries()];
  }, [services.data, search]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await serviceCatalog.remove(deleting.id);
      toast.success('Prestation supprimée.');
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Prestations"
        description="Votre carte de soins : durées, tarifs, visibilité et collaborateurs habilités."
        actions={
          <>
            <ToneButton tone="violet" onClick={() => setCategoriesOpen(true)} disabled={!services.data}>
              <Tags size={16} /> Catégories
            </ToneButton>
            <PrimaryButton onClick={() => setEditing('new')} disabled={!services.data}>
              <Plus size={16} /> Nouvelle prestation
            </PrimaryButton>
          </>
        }
      />
      <div className="mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une prestation" />
      </div>
      <QueryBoundary loading={services.loading && !services.data} error={services.error} onRetry={services.refetch}>
        {groups.length === 0 ? (
          <EmptyState title="Aucune prestation" description="Créez votre première prestation." />
        ) : (
          <div className="space-y-8">
            {groups.map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{category}</h2>
                <Table fixed head={['Prestation', 'Durée', 'Tarif', 'Visibilité', 'Collaborateurs', '']}>
                  {items.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color ?? '#0a0a0a' }} aria-hidden />
                          <span className="font-medium text-neutral-950">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">{formatDuration(s.duration)}</td>
                      <td className="px-5 py-3 tabular-nums">{priceLabel(s)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={s.visibility === 'HIDDEN' ? 'muted' : 'neutral'}>{VISIBILITY_LABELS[s.visibility ?? 'BOOKABLE'] ?? s.visibility}</Badge>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-neutral-600">{s.employeeServices?.length ?? 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <IconAction kind="edit" label={`Modifier ${s.name}`} onClick={() => setEditing(s)} />
                          <IconAction kind="delete" label={`Supprimer ${s.name}`} onClick={() => setDeleting(s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </section>
            ))}
          </div>
        )}
      </QueryBoundary>

      {editing && (
        <ServiceFormDialog
          service={editing === 'new' ? null : editing}
          categories={services.data?.categories ?? []}
          employees={(employees ?? []).filter((e) => e.isActive)}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {categoriesOpen && <CategoriesDialog categories={services.data?.categories ?? []} onClose={() => setCategoriesOpen(false)} onSaved={refresh} />}
      <ConfirmDialog
        open={!!deleting}
        title={`Supprimer ${deleting?.name ?? ''} ?`}
        description="Les rendez vous liés à cette prestation seront aussi supprimés. Pour seulement ne plus la proposer, choisissez plutôt la visibilité « Masquée »."
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
