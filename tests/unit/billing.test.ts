import { describe, expect, it } from 'vitest';
import { tiersError } from '@/lib/billing';

describe('tiersError', () => {
  it('accepts contiguous tiers ending open', () => {
    expect(tiersError([{ min: 1, max: 1, price: 250 }, { min: 2, max: 3, price: 150 }, { min: 4, max: null, price: 80 }])).toBeNull();
  });

  it('refuses a gap, an inverted range and an open tier in the middle', () => {
    expect(tiersError([{ min: 1, max: 2, price: 1 }, { min: 4, max: null, price: 1 }])).toMatch(/commencer à 3/);
    expect(tiersError([{ min: 3, max: 2, price: 1 }])).toMatch(/maximum/);
    expect(tiersError([{ min: 1, max: null, price: 1 }, { min: 2, max: null, price: 1 }])).toMatch(/dernier palier/);
  });
});
