'use client';

import { useState } from 'react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { serviceCatalog, type ServiceInput } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { personName } from '@/lib/format';
import type { Employee, Service } from '@/lib/types/catalog';
import { Select } from '@/components/ui/select';

type PriceType = 'FIXED' | 'FROM' | 'RANGE';

export const VISIBILITY_LABELS: Record<string, string> = {
  BOOKABLE: 'Réservable en ligne',
  VISIBLE: 'Visible, sur appel',
  HIDDEN: 'Masquée',
};

const DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

export function ServiceFormDialog({
  service,
  categories,
  employees,
  onClose,
  onSaved,
}: {
  service: Service | null;
  categories: string[];
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: service?.name ?? '',
    abbreviation: service?.abbreviation ?? '',
    category: service?.category ?? categories[0] ?? '',
    color: service?.color && /^#[0-9a-f]{6}$/i.test(service.color) ? service.color : '#0a0a0a',
    duration: service?.duration ?? 60,
    priceType: ((service?.priceType as PriceType) ?? 'FIXED') as PriceType,
    price: service?.price ? String(service.price) : '',
    priceFrom: service?.priceFrom ? String(service.priceFrom) : '',
    priceTo: service?.priceTo ? String(service.priceTo) : '',
    onQuote: service?.onQuote ?? false,
    visibility: (service?.visibility as string) ?? 'BOOKABLE',
    description: service?.description ?? '',
    employeeIds: service?.employeeServices?.map((e) => e.employeeId) ?? employees.map((e) => e.id),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const amount = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);

  const submit = async () => {
    if (!form.name.trim()) return setError('Le nom est requis.');
    const price = amount(form.price);
    const priceFrom = amount(form.priceFrom);
    const priceTo = amount(form.priceTo);
    if (!form.onQuote) {
      if (form.priceType === 'FIXED' && !(price && price > 0)) return setError('Indiquez un prix supérieur à 0.');
      if (form.priceType !== 'FIXED' && !(priceFrom && priceFrom > 0)) return setError('Indiquez un prix minimum supérieur à 0.');
      if (form.priceType === 'RANGE' && !(priceTo && priceFrom && priceTo >= priceFrom)) return setError('Le prix maximum doit dépasser le prix minimum.');
    }
    const input: ServiceInput = {
      name: form.name.trim(),
      abbreviation: form.abbreviation.trim() || undefined,
      category: form.category || undefined,
      color: form.color,
      duration: form.duration,
      priceType: form.priceType,
      // The backend keeps `price` as the reference amount (stats, sales).
      price: form.priceType === 'FIXED' ? price : priceFrom,
      priceFrom: form.priceType === 'FIXED' ? undefined : priceFrom,
      priceTo: form.priceType === 'RANGE' ? priceTo : undefined,
      onQuote: form.onQuote,
      visibility: form.visibility as ServiceInput['visibility'],
      description: form.description.trim() || undefined,
      employeeIds: form.employeeIds,
    };
    setBusy(true);
    setError(null);
    try {
      if (service) await serviceCatalog.update(service.id, input);
      else await serviceCatalog.create(input);
      toast.success(service ? 'Prestation mise à jour.' : 'Prestation créée.');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title={service ? 'Modifier la prestation' : 'Nouvelle prestation'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {error && (
          <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <FormField label="Nom" className="sm:col-span-2">
          <input className={fieldClass} maxLength={100} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Catégorie">
          <Select value={form.category} onValueChange={(v) => set('category', v)}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Abréviation (agenda)">
          <input className={fieldClass} maxLength={12} value={form.abbreviation} onChange={(e) => set('abbreviation', e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Durée">
          <Select value={form.duration} onValueChange={(v) => set('duration', Number(v))}>
            {[...new Set([...DURATIONS, form.duration])].sort((a, b) => a - b).map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Couleur">
          <input type="color" className="h-[42px] w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-1" value={form.color} onChange={(e) => set('color', e.target.value)} />
        </FormField>
        <FormField label="Tarif">
          <Select value={form.priceType} onValueChange={(v) => set('priceType', v as PriceType)} disabled={form.onQuote}>
            <option value="FIXED">Prix fixe</option>
            <option value="FROM">À partir de</option>
            <option value="RANGE">Fourchette</option>
          </Select>
        </FormField>
        {form.priceType === 'FIXED' ? (
          <FormField label="Prix (DH)">
            <input className={fieldClass} inputMode="decimal" disabled={form.onQuote} value={form.price} onChange={(e) => set('price', e.target.value)} />
          </FormField>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Minimum (DH)">
              <input className={fieldClass} inputMode="decimal" disabled={form.onQuote} value={form.priceFrom} onChange={(e) => set('priceFrom', e.target.value)} />
            </FormField>
            {form.priceType === 'RANGE' && (
              <FormField label="Maximum (DH)">
                <input className={fieldClass} inputMode="decimal" disabled={form.onQuote} value={form.priceTo} onChange={(e) => set('priceTo', e.target.value)} />
              </FormField>
            )}
          </div>
        )}
        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" className="h-4 w-4 accent-neutral-950" checked={form.onQuote} onChange={(e) => set('onQuote', e.target.checked)} />
          Prix sur devis
        </label>
        <FormField label="Visibilité" className="sm:col-span-2">
          <Select value={form.visibility} onValueChange={(v) => set('visibility', v)}>
            {Object.entries(VISIBILITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Collaborateurs habilités" className="sm:col-span-2" group>
          <div className="flex flex-wrap gap-2">
            {employees.map((e) => {
              const active = form.employeeIds.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set('employeeIds', active ? form.employeeIds.filter((x) => x !== e.id) : [...form.employeeIds, e.id])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {personName(e)}
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="Description (facultatif)" className="sm:col-span-2">
          <textarea className={fieldClass} rows={3} maxLength={1000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
