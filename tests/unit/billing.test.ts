import { describe, expect, it } from 'vitest';
import { discountsLine, freelanceGrid, salonDiscount, salonGrid, type PricingConfig } from '@/lib/plans';

const P: PricingConfig = {
  salonFirstPrice: 200,
  salonNextPrice: 100,
  salonNextCount: 3,
  salonExtraPrice: 10,
  discount3: 10,
  discount6: 15,
  discount12: 25,
  freelanceMonthly: 200,
  freelance6: 1000,
  freelance12: 1800,
};

describe('plan texts', () => {
  it('describes the salon grid and the discounts', () => {
    expect(salonGrid(P)).toMatch(/200.*1er collaborateur.*100.*les 3 suivants.*10/);
    expect(discountsLine(P)).toBe('Remise de 10 % sur 3 mois, 15 % sur 6 mois et 25 % sur 1 an.');
    expect(freelanceGrid(P)).toMatch(/200.*par mois.*1.?000.*6 mois.*1.?800/);
  });

  it('picks the discount of the period', () => {
    expect(salonDiscount(1, P)).toBe(0);
    expect(salonDiscount(3, P)).toBe(10);
    expect(salonDiscount(6, P)).toBe(15);
    expect(salonDiscount(12, P)).toBe(25);
  });
});
