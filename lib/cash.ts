import { addDays, startOfDay, startOfWeek } from './format';
import type { CashPeriod, CashTransaction, LedgerType, PaymentMethod } from './types/cash';
import type { Invoice, InvoiceStatus } from './api/services/invoice.service';

/** ISO bounds (local days) of a register period; `all` has no bounds. */
export function cashPeriodRange(period: CashPeriod, now = new Date()): { startDate?: string; endDate?: string } {
  if (period === 'all') return {};
  const start =
    period === 'day' ? startOfDay(now) : period === 'week' ? startOfWeek(now) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(startOfDay(addDays(now, 1)).getTime() - 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

/** One line of the register: an invoice (sale) or a drawer movement. */
export interface LedgerEntry {
  id: string;
  kind: 'invoice' | 'movement';
  type: LedgerType;
  date: string;
  label: string;
  reference?: string;
  method?: PaymentMethod | null;
  /** Signed: money in is positive, money out negative. */
  amount: number;
  status?: InvoiceStatus;
  invoice?: Invoice;
  movement?: CashTransaction;
}

export function buildLedger(invoices: Invoice[], movements: CashTransaction[]): LedgerEntry[] {
  const sales: LedgerEntry[] = invoices
    .filter((i) => i.type === 'SALE')
    .map((i) => ({
      id: i.id,
      kind: 'invoice',
      type: 'SALE',
      date: i.paidAt ?? i.createdAt,
      label: i.client ? `${i.client.firstName} ${i.client.lastName}` : 'Client de passage',
      reference: i.invoiceNumber,
      method: i.paymentMethod,
      amount: i.total,
      status: i.status,
      invoice: i,
    }));
  const moves: LedgerEntry[] = movements.map((m) => ({
    id: m.id,
    kind: 'movement',
    type: m.type,
    date: m.createdAt,
    label: m.notes || '',
    method: m.paymentMethod,
    amount: m.type === 'DEPOSIT' ? m.amount : -m.amount,
    movement: m,
  }));
  return [...sales, ...moves].sort((a, b) => b.date.localeCompare(a.date));
}

export interface LedgerTotals {
  /** Paid sales. */
  collected: number;
  /** Sales still to be paid. */
  pending: number;
  refunds: number;
  deposits: number;
  withdrawals: number;
  /** Cash drawer: cash sales + deposits, minus cash refunds and withdrawals. */
  cashBalance: number;
  byMethod: Record<string, number>;
}

export function ledgerTotals(entries: LedgerEntry[]): LedgerTotals {
  const totals: LedgerTotals = { collected: 0, pending: 0, refunds: 0, deposits: 0, withdrawals: 0, cashBalance: 0, byMethod: {} };
  for (const e of entries) {
    if (e.kind === 'invoice') {
      if (e.status === 'PAID') {
        totals.collected += e.amount;
        if (e.method) totals.byMethod[e.method] = (totals.byMethod[e.method] ?? 0) + e.amount;
        if (e.method === 'CASH') totals.cashBalance += e.amount;
      } else if (e.status === 'PENDING' || e.status === 'OVERDUE') {
        totals.pending += e.amount;
      }
      continue;
    }
    if (e.type === 'DEPOSIT') totals.deposits += e.amount;
    if (e.type === 'WITHDRAWAL') totals.withdrawals += -e.amount;
    if (e.type === 'REFUND') totals.refunds += -e.amount;
    if (e.method === 'CASH') totals.cashBalance += e.amount;
  }
  return totals;
}
