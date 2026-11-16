'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clock, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ServiceFormDialog, VISIBILITY_LABELS } from '@/components/admin/ServiceFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { PageHeader, SearchInput } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useEmployees, useServices, referenceKeys } from '@/hooks/useReferenceData';
import { useAuth } from '@/contexts/AuthContext';
import { invalidate } from '@/lib/api/memo';
import { serviceCatalog, type ServiceInput } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDuration, formatMoney, personName } from '@/lib/format';
import { groupServices, moveService, NO_CATEGORY, type ServiceGroups } from '@/lib/serviceOrder';
import type { Service } from '@/lib/types/catalog';
import { useUrlAction } from '@/hooks/useUrlAction';

function priceLabel(s: Service) {
  if (s.onQuote) return s.priceFrom || s.price ? `À partir de ${formatMoney(s.priceFrom ?? s.price)} (sur devis)` : 'Sur devis';
  if (s.priceType === 'FROM') return `À partir de ${formatMoney(s.priceFrom ?? s.price)}`;
  if (s.priceType === 'RANGE') return `${formatMoney(s.priceFrom)} à ${formatMoney(s.priceTo)}`;
  return formatMoney(s.price);
}

/** Categories: add, remove and order them (the order of the list below). */
function CategoriesDialog({ categories, onClose, onSaved }: { categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [list, setList] = useState(categories);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const move = (index: number, delta: number) =>
    setList((l) => {
      const next = [...l];
      const target = index + delta;
      if (target < 0 || target >= next.length) return l;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

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
      <p className="mb-3 text-sm text-neutral-500">L&apos;ordre ci dessous est celui de votre carte.</p>
      <ul className="mb-4 space-y-2">
        {list.map((c, i) => (
          <li key={c} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
            <span className="truncate">{c}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Monter ${c}`} className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre ${c}`} className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => setList((l) => l.filter((x) => x !== c))} aria-label={`Retirer ${c}`} className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                <X size={14} />
              </button>
            </span>
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
        <SecondaryButton type="submit" aria-label="Ajouter la catégorie">
          <Plus size={15} />
        </SecondaryButton>
      </form>
    </Modal>
  );
}

function ServiceRow({
  service,
  dragging,
  dropBefore,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  service: Service;
  dragging: boolean;
  dropBefore: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const visible = service.visibility ?? 'BOOKABLE';
  const team = (service.employeeServices ?? []).map((es) => (es.employee ? personName(es.employee) : '')).filter(Boolean);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', service.id);
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative flex items-center gap-4 border-b border-neutral-100 px-4 py-4 transition-colors last:border-b-0 hover:bg-neutral-50 sm:px-5 ${dragging ? 'opacity-40' : ''}`}
    >
      {dropBefore && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-neutral-950" aria-hidden />}
      <GripVertical size={16} className="shrink-0 cursor-grab text-neutral-300 transition group-hover:text-neutral-500 active:cursor-grabbing" aria-hidden />
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: service.color ?? '#0a0a0a' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-neutral-950">{service.name}</h3>
          {service.abbreviation && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{service.abbreviation}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> {formatDuration(service.duration)}
          </span>
          <span className="font-medium text-neutral-900">{priceLabel(service)}</span>
          <span className="flex items-center gap-1.5">
            {visible === 'HIDDEN' ? <EyeOff size={13} /> : <Eye size={13} />}
            {VISIBILITY_LABELS[visible] ?? visible}
          </span>
          {team.length > 0 && <span className="truncate text-neutral-400">{team.join(', ')}</span>}
        </div>
      </div>
      {/* Actions on hover (and always reachable with the keyboard). */}
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button type="button" onClick={onDuplicate} title="Dupliquer" aria-label={`Dupliquer ${service.name}`} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950">
          <Copy size={16} />
        </button>
        <button type="button" onClick={onEdit} title="Modifier" aria-label={`Modifier ${service.name}`} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={onDelete} title="Supprimer" aria-label={`Supprimer ${service.name}`} className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const toast = useToast();
  const { activeSalon } = useAuth();
  const services = useServices();
  const { data: employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  useUrlAction({ new: () => setEditing('new') });
  const [busy, setBusy] = useState(false);

  // Local order while dragging (null: the saved order).
  const [local, setLocal] = useState<ServiceGroups | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ category: string; before: string | null } | null>(null);

  const refresh = () => {
    if (activeSalon) invalidate(referenceKeys.services(activeSalon.id));
    void services.refetch();
  };

  const declared = useMemo(() => services.data?.categories ?? [], [services.data]);
  const saved = useMemo(() => groupServices(services.data?.services ?? [], declared), [services.data, declared]);
  const groups = local ?? saved;
  const term = search.trim().toLowerCase();
  const filtering = term !== '' || filter !== 'all';
  const shown = groups
    .filter(([category]) => filter === 'all' || category === filter)
    .map(([category, list]) => [category, list.filter((s) => !term || s.name.toLowerCase().includes(term) || s.abbreviation?.toLowerCase().includes(term))] as const)
    .filter(([, list]) => !filtering || list.length > 0);

  const drop = async (category: string, before: string | null) => {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id) return;
    const { groups: next, changes } = moveService(groups, id, category, before);
    if (changes.length === 0) return;
    setLocal(next);
    try {
      await serviceCatalog.reorder(changes);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLocal(null);
    }
  };

  const duplicate = async (s: Service) => {
    try {
      await serviceCatalog.create({
        name: `${s.name} (copie)`.slice(0, 80),
        abbreviation: s.abbreviation ?? undefined,
        description: s.description ?? undefined,
        category: s.category ?? undefined,
        color: s.color ?? undefined,
        price: s.price,
        priceType: s.priceType as ServiceInput['priceType'],
        priceFrom: s.priceFrom ?? undefined,
        priceTo: s.priceTo ?? undefined,
        onQuote: s.onQuote,
        duration: s.duration,
        visibility: s.visibility as ServiceInput['visibility'],
        multipleProviders: s.multipleProviders,
        competences: s.competences,
        employeeIds: (s.employeeServices ?? []).map((es) => es.employeeId),
      });
      toast.success(`« ${s.name} » dupliquée.`);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

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

  const total = (services.data?.services ?? []).length;

  return (
    <div>
      <PageHeader
        title="Gestion des prestations"
        description="Gérez vos services, catégories et tarifs. Glissez une prestation pour la déplacer."
        actions={
          <>
            <SecondaryButton onClick={() => setCategoriesOpen(true)} disabled={!services.data}>
              <Plus size={16} /> Catégorie
            </SecondaryButton>
            <PrimaryButton onClick={() => setEditing('new')} disabled={!services.data}>
              <Plus size={16} /> Nouvelle prestation
            </PrimaryButton>
          </>
        }
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_260px]">
        <SearchInput fill value={search} onChange={setSearch} placeholder="Rechercher une prestation..." />
        <Select value={filter} onValueChange={setFilter} aria-label="Catégorie">
          <option value="all">Toutes les catégories</option>
          {groups.map(([category]) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </div>
      <QueryBoundary loading={services.loading && !services.data} error={services.error} onRetry={services.refetch}>
        {total === 0 ? (
          <EmptyState title="Aucune prestation" description="Créez votre première prestation." />
        ) : shown.length === 0 ? (
          <div className="text-center">
            <EmptyState title="Aucune prestation trouvée" />
            <button type="button" onClick={() => (setSearch(''), setFilter('all'))} className="mt-3 text-sm font-medium text-neutral-950 underline">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {shown.map(([category, items]) => (
              <section
                key={category}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  if (over?.category !== category || over.before !== null) setOver({ category, before: null });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void drop(category, null);
                }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-lg font-medium uppercase tracking-wide text-neutral-950">{category}</h2>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {items.length} {items.length > 1 ? 'prestations' : 'prestation'}
                  </span>
                </div>
                <div className={`overflow-hidden rounded-2xl border bg-white transition-colors ${dragId && over?.category === category ? 'border-neutral-950' : 'border-neutral-200'}`}>
                  {items.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-neutral-400">
                      {dragId ? 'Déposez la prestation ici' : category === NO_CATEGORY ? 'Aucune prestation' : 'Aucune prestation dans cette catégorie'}
                    </p>
                  ) : (
                    items.map((s) => (
                      <ServiceRow
                        key={s.id}
                        service={s}
                        dragging={dragId === s.id}
                        dropBefore={!!dragId && dragId !== s.id && over?.category === category && over.before === s.id}
                        onEdit={() => setEditing(s)}
                        onDuplicate={() => void duplicate(s)}
                        onDelete={() => setDeleting(s)}
                        onDragStart={() => setDragId(s.id)}
                        onDragOver={(e) => {
                          if (!dragId) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (over?.before !== s.id) setOver({ category, before: s.id });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void drop(category, s.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOver(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </QueryBoundary>

      {editing && (
        <ServiceFormDialog
          service={editing === 'new' ? null : editing}
          categories={declared}
          employees={(employees ?? []).filter((e) => e.isActive)}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {categoriesOpen && <CategoriesDialog categories={declared} onClose={() => setCategoriesOpen(false)} onSaved={refresh} />}
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
