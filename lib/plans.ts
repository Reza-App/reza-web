import { formatMoney } from './format';

/** Selia subscription plans (same rules as the API, subscription/pricing.ts). */
export type Plan = 'SALON' | 'FREELANCE';

export interface PricingConfig {
  salonFirstPrice: number;
  salonNextPrice: number;
  salonNextCount: number;
  salonExtraPrice: number;
  discount3: number;
  discount6: number;
  discount12: number;
  freelanceMonthly: number;
  freelance6: number;
  freelance12: number;
}

export interface PlanQuote {
  plan: Plan;
  months: number;
  total: number;
  perMonth: number;
  savings: number;
}

export const PLAN_LABELS: Record<Plan, string> = { SALON: 'Salon', FREELANCE: 'Freelance' };

export const PLAN_DURATIONS: Record<Plan, number[]> = { SALON: [1, 3, 6, 12], FREELANCE: [1, 6, 12] };

export const PLAN_PITCH: Record<Plan, string> = {
  SALON: 'Pour une équipe : le prix suit le nombre de collaborateurs de chaque salon.',
  FREELANCE: 'Pour une seule personne qui travaille à son compte.',
};

export const durationLabel = (months: number) => (months === 12 ? '1 an' : `${months} mois`);

export function salonDiscount(months: number, p: PricingConfig): number {
  if (months >= 12) return p.discount12;
  if (months >= 6) return p.discount6;
  if (months >= 3) return p.discount3;
  return 0;
}

/** "200 DH le 1er collaborateur, 100 DH les 3 suivants, puis 10 DH" (per month). */
export function salonGrid(p: PricingConfig): string {
  const next = p.salonNextCount > 0 ? `, ${formatMoney(p.salonNextPrice)} ${p.salonNextCount > 1 ? `les ${p.salonNextCount} suivants` : 'le suivant'}` : '';
  return `${formatMoney(p.salonFirstPrice)} le 1er collaborateur${next}, puis ${formatMoney(p.salonExtraPrice)} par collaborateur au delà, par mois et par salon`;
}

export function discountsLine(p: PricingConfig): string {
  return `Remise de ${p.discount3} % sur 3 mois, ${p.discount6} % sur 6 mois et ${p.discount12} % sur 1 an.`;
}

export function freelanceGrid(p: PricingConfig): string {
  return `${formatMoney(p.freelanceMonthly)} par mois, ${formatMoney(p.freelance6)} les 6 mois, ${formatMoney(p.freelance12)} l'année.`;
}

/** Collaborators billed at each tier for a salon of `team` people. */
function salonTiers(team: number, p: PricingConfig) {
  const n = Math.max(1, Math.floor(team));
  const next = Math.min(n - 1, p.salonNextCount);
  const extra = Math.max(0, n - 1 - p.salonNextCount);
  return { next, extra };
}

/** Monthly price of one salon with `team` collaborators (same as the API). */
export function salonMonthly(team: number, p: PricingConfig): number {
  const { next, extra } = salonTiers(team, p);
  return p.salonFirstPrice + next * p.salonNextPrice + extra * p.salonExtraPrice;
}

/** "200 + 3 × 100 + 2 × 10": how the monthly price of `team` is built. */
export function salonFormula(team: number, p: PricingConfig): string {
  const { next, extra } = salonTiers(team, p);
  return [String(p.salonFirstPrice), next > 0 ? `${next} × ${p.salonNextPrice}` : '', extra > 0 ? `${extra} × ${p.salonExtraPrice}` : ''].filter(Boolean).join(' + ');
}
