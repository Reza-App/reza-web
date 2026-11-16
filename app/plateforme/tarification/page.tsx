'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FormField, fieldClass } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { type BillingConfig, type EmployeeTier, platformService } from '@/lib/api/services/platform.service';
import { tiersError } from '@/lib/billing';
import { formatMoney } from '@/lib/format';

const toNumber = (value: string, fallback = 0) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function save(config: BillingConfig) {
  const tiers = config.employeeTiers?.length ? config.employeeTiers : null;
  const error = tiers ? tiersError(tiers) : null;
  if (error) return Promise.reject(new Error(error));
  return platformService.saveBilling({
    pricePerSalon: config.pricePerSalon,
    freeEmployeeThreshold: Math.trunc(config.freeEmployeeThreshold),
    pricePerEmployee: config.pricePerEmployee,
    employeeTiers: tiers,
    currency: config.currency.trim().toUpperCase(),
    bankName: config.bankName?.trim() ?? '',
    bankAccountHolder: config.bankAccountHolder?.trim() ?? '',
    bankRib: config.bankRib?.replace(/\s+/g, ' ').trim() ?? '',
    bankSwift: config.bankSwift?.trim().toUpperCase() ?? '',
    transferNote: config.transferNote?.trim() ?? '',
  });
}

export default function PlatformBillingPage() {
  const form = useSettingsForm('platform-billing', (s) => platformService.billing(s), save, 'Tarification enregistrée.');
  const draft = form.draft;
  const tiers = draft?.employeeTiers ?? [];
  const set = (patch: Partial<BillingConfig>) => form.setDraft((d) => d && { ...d, ...patch });
  const setTier = (index: number, patch: Partial<EmployeeTier>) => set({ employeeTiers: tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const min = last ? (last.max ?? last.min) + 1 : 1;
    set({ employeeTiers: [...tiers.map((t, i) => (i === tiers.length - 1 && t.max === null ? { ...t, max: t.min } : t)), { min, max: null, price: draft?.pricePerEmployee ?? 0 }] });
  };
  const tierProblem = tiersError(tiers);

  return (
    <div>
      <PageHeader
        title="Tarification"
        description="Prix de l'abonnement Selia appliqués aux établissements."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!draft} error={form.query.error} onRetry={form.query.refetch}>
        {draft && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Abonnement">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Frais d&apos;activation par salon" hint="Payés une seule fois, à l&apos;ouverture du salon.">
                  <input className={fieldClass} inputMode="decimal" value={draft.pricePerSalon} onChange={(e) => set({ pricePerSalon: toNumber(e.target.value) })} />
                </FormField>
                <FormField label="Devise" hint="Code à 3 lettres (MAD).">
                  <input className={fieldClass} maxLength={8} value={draft.currency} onChange={(e) => set({ currency: e.target.value })} />
                </FormField>
                <FormField label="Collaborateurs inclus" hint="Par salon, sans frais mensuels.">
                  <input className={fieldClass} inputMode="numeric" value={draft.freeEmployeeThreshold} onChange={(e) => set({ freeEmployeeThreshold: Math.trunc(toNumber(e.target.value)) })} />
                </FormField>
                <FormField label="Prix par collaborateur" hint="Utilisé quand aucun palier n'est défini.">
                  <input className={fieldClass} inputMode="decimal" value={draft.pricePerEmployee} onChange={(e) => set({ pricePerEmployee: toNumber(e.target.value) })} />
                </FormField>
              </div>
            </Card>

            <Card title="Paliers collaborateurs (par mois)">
              <p className="mb-4 text-sm text-neutral-500">
                Prix mensuel par collaborateur, selon le nombre de collaborateurs facturés du salon (tous au prix du palier atteint). Sans palier, le prix par collaborateur ({formatMoney(draft.pricePerEmployee)}) s&apos;applique.
              </p>
              {tiers.length > 0 && (
                <ul className="space-y-2">
                  {tiers.map((t, i) => (
                    <li key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                      <FormField label="De">
                        <input className={fieldClass} inputMode="numeric" value={t.min} onChange={(e) => setTier(i, { min: Math.trunc(toNumber(e.target.value, 1)) })} />
                      </FormField>
                      <FormField label="À">
                        <input
                          className={fieldClass}
                          inputMode="numeric"
                          placeholder="et plus"
                          value={t.max ?? ''}
                          onChange={(e) => setTier(i, { max: e.target.value.trim() === '' ? null : Math.trunc(toNumber(e.target.value, t.min)) })}
                        />
                      </FormField>
                      <FormField label="Prix">
                        <input className={fieldClass} inputMode="decimal" value={t.price} onChange={(e) => setTier(i, { price: toNumber(e.target.value) })} />
                      </FormField>
                      <button
                        type="button"
                        onClick={() => set({ employeeTiers: tiers.filter((_, j) => j !== i) })}
                        className="mb-1 rounded-full p-2.5 text-red-600 hover:bg-red-50"
                        aria-label={`Supprimer le palier ${i + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {tierProblem && <p className="mt-3 text-sm text-red-600">{tierProblem}</p>}
              <button type="button" onClick={addTier} className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                <Plus size={16} /> Ajouter un palier
              </button>
            </Card>

            <Card title="Coordonnées bancaires" className="xl:col-span-2">
              <p className="mb-4 text-sm text-neutral-500">Affichées aux établissements sur leur page d&apos;abonnement, pour effectuer leur virement.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Titulaire du compte">
                  <input className={fieldClass} maxLength={160} value={draft.bankAccountHolder ?? ''} onChange={(e) => set({ bankAccountHolder: e.target.value })} />
                </FormField>
                <FormField label="Banque">
                  <input className={fieldClass} maxLength={120} value={draft.bankName ?? ''} onChange={(e) => set({ bankName: e.target.value })} />
                </FormField>
                <FormField label="RIB" hint="24 chiffres.">
                  <input className={fieldClass} maxLength={60} inputMode="numeric" value={draft.bankRib ?? ''} onChange={(e) => set({ bankRib: e.target.value })} />
                </FormField>
                <FormField label="Code SWIFT (facultatif)">
                  <input className={fieldClass} maxLength={20} value={draft.bankSwift ?? ''} onChange={(e) => set({ bankSwift: e.target.value })} />
                </FormField>
                <FormField label="Consigne (facultatif)" hint="Par exemple : indiquez le nom de votre salon en motif du virement." className="sm:col-span-2">
                  <input className={fieldClass} maxLength={500} value={draft.transferNote ?? ''} onChange={(e) => set({ transferNote: e.target.value })} />
                </FormField>
              </div>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
