'use client';

import { FormField, fieldClass } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { type BillingConfig, platformService } from '@/lib/api/services/platform.service';
import { formatMoney } from '@/lib/format';
import { durationLabel, PLAN_DURATIONS, type PricingConfig, salonDiscount } from '@/lib/plans';

const PRICE_KEYS: (keyof PricingConfig)[] = [
  'salonFirstPrice',
  'salonNextPrice',
  'salonNextCount',
  'salonExtraPrice',
  'discount3',
  'discount6',
  'discount12',
  'freelanceMonthly',
  'freelance6',
  'freelance12',
];

/** Same formula as the API (subscription/pricing.ts), for the preview. */
function salonMonthly(n: number, p: PricingConfig) {
  const count = Math.max(1, n);
  return p.salonFirstPrice + Math.min(count - 1, p.salonNextCount) * p.salonNextPrice + Math.max(0, count - 1 - p.salonNextCount) * p.salonExtraPrice;
}

function salonPeriod(n: number, months: number, p: PricingConfig) {
  return Math.round(salonMonthly(n, p) * months * (1 - salonDiscount(months, p) / 100) * 100) / 100;
}

function freelancePeriod(months: number, p: PricingConfig) {
  return months === 12 ? p.freelance12 : months === 6 ? p.freelance6 : p.freelanceMonthly * months;
}

/** Live price table: what a salon of 1 to 6 collaborators pays for each period. */
function Preview({ pricing }: { pricing: PricingConfig }) {
  const team = [1, 2, 3, 4, 5, 6];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.08em] text-neutral-500">
            <th className="py-2 pr-4 font-medium">Collaborateurs</th>
            {PLAN_DURATIONS.SALON.map((m) => (
              <th key={m} className="py-2 pr-4 font-medium">
                {durationLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {team.map((n) => (
            <tr key={n}>
              <td className="py-2 pr-4 text-neutral-700">Salon, {n}</td>
              {PLAN_DURATIONS.SALON.map((m) => (
                <td key={m} className="py-2 pr-4 tabular-nums text-neutral-950">
                  {formatMoney(salonPeriod(n, m, pricing))}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="py-2 pr-4 text-neutral-700">Freelance</td>
            {PLAN_DURATIONS.SALON.map((m) => (
              <td key={m} className="py-2 pr-4 tabular-nums text-neutral-950">
                {PLAN_DURATIONS.FREELANCE.includes(m) ? formatMoney(freelancePeriod(m, pricing)) : <span className="text-neutral-400">Non proposé</span>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const toNumber = (value: string, fallback = 0) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function save(config: BillingConfig) {
  if (config.discount3 > 90 || config.discount6 > 90 || config.discount12 > 90) return Promise.reject(new Error('Une remise ne peut pas dépasser 90 %.'));
  const prices = Object.fromEntries(PRICE_KEYS.map((k) => [k, k === 'salonNextCount' ? Math.trunc(config[k]) : config[k]])) as unknown as PricingConfig;
  return platformService.saveBilling({
    ...prices,
    currency: config.currency.trim().toUpperCase(),
    bankName: config.bankName?.trim() ?? '',
    bankAccountHolder: config.bankAccountHolder?.trim() ?? '',
    bankRib: config.bankRib?.replace(/\s+/g, ' ').trim() ?? '',
    bankSwift: config.bankSwift?.trim().toUpperCase() ?? '',
    transferNote: config.transferNote?.trim() ?? '',
    companyName: config.companyName?.trim() ?? '',
    companyAddress: config.companyAddress?.trim() ?? '',
    companyIce: config.companyIce?.trim() ?? '',
    companyRc: config.companyRc?.trim() ?? '',
    companyIf: config.companyIf?.trim() ?? '',
    companyPatente: config.companyPatente?.trim() ?? '',
    vatRate: config.vatRate ?? 0,
  });
}

export default function PlatformBillingPage() {
  const form = useSettingsForm('platform-billing', (s) => platformService.billing(s), save, 'Tarification enregistrée.');
  const draft = form.draft;
  const set = (patch: Partial<BillingConfig>) => form.setDraft((d) => d && { ...d, ...patch });
  const price = (key: keyof PricingConfig, label: string, hint?: string, integer = false) =>
    draft && (
      <FormField label={label} hint={hint}>
        <input
          className={fieldClass}
          inputMode={integer ? 'numeric' : 'decimal'}
          value={draft[key]}
          onChange={(e) => set({ [key]: integer ? Math.trunc(toNumber(e.target.value)) : toNumber(e.target.value) } as Partial<BillingConfig>)}
        />
      </FormField>
    );

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
            <Card title="Plan Salon">
              <p className="mb-4 text-sm text-neutral-500">Prix mensuel par salon, selon ses collaborateurs actifs. Un salon paie au moins un collaborateur.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {price('salonFirstPrice', '1er collaborateur')}
                {price('salonNextPrice', 'Collaborateurs suivants', 'Prix de chacun.')}
                {price('salonNextCount', 'Nombre de collaborateurs suivants', 'Au prix ci dessus (3 : du 2e au 4e).', true)}
                {price('salonExtraPrice', 'Au delà', 'Prix de chaque collaborateur supplémentaire.')}
                {price('discount3', 'Remise 3 mois (%)')}
                {price('discount6', 'Remise 6 mois (%)')}
                {price('discount12', 'Remise 1 an (%)')}
                <FormField label="Devise" hint="Code à 3 lettres (MAD).">
                  <input className={fieldClass} maxLength={8} value={draft.currency} onChange={(e) => set({ currency: e.target.value })} />
                </FormField>
              </div>
            </Card>

            <Card title="Plan Freelance">
              <p className="mb-4 text-sm text-neutral-500">Une seule personne, prix fixes par période. Toutes les fonctionnalités sont incluses dans les deux plans.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {price('freelanceMonthly', '1 mois')}
                {price('freelance6', '6 mois')}
                {price('freelance12', '1 an')}
              </div>
            </Card>

            <Card title="Aperçu des prix" className="xl:col-span-2">
              <Preview pricing={draft} />
            </Card>

            <Card title="Mentions légales des factures" className="xl:col-span-2">
              <p className="mb-4 text-sm text-neutral-500">Imprimées sur chaque facture Selia. ICE, RC et IF sont obligatoires sur une facture au Maroc.</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <FormField label="Raison sociale">
                  <input className={fieldClass} maxLength={160} value={draft.companyName ?? ''} onChange={(e) => set({ companyName: e.target.value })} placeholder="Selia SARL" />
                </FormField>
                <FormField label="Adresse du siège" className="sm:col-span-1 xl:col-span-2">
                  <input className={fieldClass} maxLength={300} value={draft.companyAddress ?? ''} onChange={(e) => set({ companyAddress: e.target.value })} />
                </FormField>
                <FormField label="ICE">
                  <input className={fieldClass} maxLength={30} inputMode="numeric" value={draft.companyIce ?? ''} onChange={(e) => set({ companyIce: e.target.value })} />
                </FormField>
                <FormField label="RC">
                  <input className={fieldClass} maxLength={40} value={draft.companyRc ?? ''} onChange={(e) => set({ companyRc: e.target.value })} />
                </FormField>
                <FormField label="IF">
                  <input className={fieldClass} maxLength={30} value={draft.companyIf ?? ''} onChange={(e) => set({ companyIf: e.target.value })} />
                </FormField>
                <FormField label="Patente (facultatif)">
                  <input className={fieldClass} maxLength={30} value={draft.companyPatente ?? ''} onChange={(e) => set({ companyPatente: e.target.value })} />
                </FormField>
                <FormField label="TVA (%)" hint="Les prix sont TTC. 0 si non assujetti. S'applique aux nouvelles factures.">
                  <input className={fieldClass} inputMode="decimal" value={draft.vatRate ?? 0} onChange={(e) => set({ vatRate: Math.min(30, toNumber(e.target.value)) })} />
                </FormField>
              </div>
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
