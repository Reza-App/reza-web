import { describe, expect, it } from 'vitest';
import { buildLedger, cashPeriodRange, ledgerTotals } from '@/lib/cash';
import type { Invoice } from '@/lib/api/services/invoice.service';
import type { CashTransaction } from '@/lib/types/cash';

const invoice = (o: Partial<Invoice>): Invoice => ({
  id: Math.random().toString(36),
  type: 'SALE',
  invoiceNumber: 'FAC-1',
  amount: 100,
  tax: 0,
  total: 100,
  status: 'PAID',
  paymentMethod: 'CASH',
  createdAt: '2026-11-10T10:00:00.000Z',
  items: [],
  ...o,
});

const move = (o: Partial<CashTransaction>): CashTransaction => ({
  id: Math.random().toString(36),
  type: 'DEPOSIT',
  amount: 50,
  paymentMethod: 'CASH',
  createdAt: '2026-11-11T10:00:00.000Z',
  ...o,
});

describe('cashPeriodRange', () => {
  const now = new Date(2026, 10, 13, 15, 30);

  it('has no bounds for "all"', () => {
    expect(cashPeriodRange('all', now)).toEqual({});
  });

  it('covers the whole local day', () => {
    const { startDate, endDate } = cashPeriodRange('day', now);
    expect(new Date(startDate!).getHours()).toBe(0);
    expect(new Date(endDate!).getDate()).toBe(13);
    expect(new Date(endDate!).getHours()).toBe(23);
  });

  it('starts weeks on Monday and months on the 1st', () => {
    expect(new Date(cashPeriodRange('week', now).startDate!).getDate()).toBe(9);
    expect(new Date(cashPeriodRange('month', now).startDate!).getDate()).toBe(1);
  });
});

describe('ledger', () => {
  const entries = buildLedger(
    [
      invoice({ total: 300, paymentMethod: 'CASH' }),
      invoice({ total: 200, paymentMethod: 'CARD' }),
      invoice({ total: 80, status: 'PENDING' }),
      invoice({ total: 999, status: 'CANCELLED' }),
      invoice({ total: 500, type: 'SUBSCRIPTION' }),
    ],
    [move({ type: 'DEPOSIT', amount: 50 }), move({ type: 'WITHDRAWAL', amount: 30 }), move({ type: 'REFUND', amount: 20, paymentMethod: 'CARD' })],
  );

  it('keeps only salon sales and signs movements', () => {
    expect(entries).toHaveLength(7);
    expect(entries.find((e) => e.type === 'WITHDRAWAL')!.amount).toBe(-30);
    expect(entries.some((e) => e.amount === 500)).toBe(false);
  });

  it('sorts newest first', () => {
    expect(entries[0].date >= entries[entries.length - 1].date).toBe(true);
  });

  it('computes totals and the cash drawer balance', () => {
    const t = ledgerTotals(entries);
    expect(t.collected).toBe(500);
    expect(t.pending).toBe(80);
    expect(t.deposits).toBe(50);
    expect(t.withdrawals).toBe(30);
    expect(t.refunds).toBe(20);
    // 300 cash sale + 50 deposit - 30 withdrawal (card refund does not touch the drawer)
    expect(t.cashBalance).toBe(320);
    expect(t.byMethod).toEqual({ CASH: 300, CARD: 200 });
  });
});

describe('toCsv', () => {
  it('escapes separators and neutralises formulas', async () => {
    const { toCsv } = await import('@/lib/csv');
    const csv = toCsv(['a', 'b'], [['=HYPERLINK("x")', 'x;y'], [-12.5, 'ok']]);
    expect(csv.split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")";"x;y"`);
    expect(csv.split('\r\n')[2]).toBe('-12.5;ok');
    expect(toCsv(['a'], [['-cmd']]).split('\r\n')[1]).toBe(`'-cmd`);
  });
});
