import type { EmployeeTier } from './api/services/platform.service';

/** Tiers must follow each other without gaps; only the last one may be open. */
export function tiersError(tiers: EmployeeTier[]): string | null {
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]!;
    if (t.min < 1 || t.price < 0) return `Palier ${i + 1} : valeurs invalides.`;
    if (t.max !== null && t.max < t.min) return `Palier ${i + 1} : le maximum doit être supérieur ou égal au minimum.`;
    if (t.max === null && i < tiers.length - 1) return `Palier ${i + 1} : seul le dernier palier peut être sans maximum.`;
    const prev = tiers[i - 1];
    if (prev && prev.max !== null && t.min !== prev.max + 1) return `Palier ${i + 1} : il doit commencer à ${prev.max + 1}.`;
  }
  return null;
}
