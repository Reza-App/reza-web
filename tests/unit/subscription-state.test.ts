import { describe, expect, it } from 'vitest';
import { subscriptionState } from '@/lib/billing';

const end = '2026-12-01T10:00:00Z';
const base = { status: 'ACTIVE', currentPeriodEnd: end, total: 0, renewalDue: false, pending: false, graceDays: 3 };
const at = (iso: string) => new Date(iso).getTime();

describe('subscriptionState', () => {
  it('is not activated before the first payment', () => {
    expect(subscriptionState({ ...base, status: 'NONE', currentPeriodEnd: null }).label).toBe('Non activé');
  });

  it('is active during the period, then to renew near the end', () => {
    expect(subscriptionState(base, at('2026-11-20T10:00:00Z')).label).toBe('Actif');
    expect(subscriptionState({ ...base, renewalDue: true, total: 450 }, at('2026-11-29T10:00:00Z')).label).toBe('À renouveler');
  });

  it('gives grace days after the end, then expires', () => {
    expect(subscriptionState(base, at('2026-12-02T10:00:00Z')).label).toBe('Période de grâce');
    expect(subscriptionState(base, at('2026-12-05T10:00:00Z')).label).toBe('Expiré');
    expect(subscriptionState({ ...base, status: 'PAST_DUE' }, at('2026-11-20T10:00:00Z')).label).toBe('Expiré');
  });

  it('mentions a payment being checked', () => {
    expect(subscriptionState({ ...base, pending: true }, at('2026-11-20T10:00:00Z')).message).toContain('en cours de vérification');
  });
});
