export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'ONLINE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  ONLINE: 'En ligne',
};

/** Manual cash drawer movements (sales come from invoices). */
export const CASH_MOVEMENT_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'REFUND'] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

/** Every line shown in the register: a sale or a drawer movement. */
export type LedgerType = 'SALE' | CashMovementType;

export const LEDGER_TYPE_LABELS: Record<LedgerType, string> = {
  SALE: 'Vente',
  DEPOSIT: 'Dépôt',
  WITHDRAWAL: 'Retrait',
  REFUND: 'Remboursement',
};

export const CASH_PERIODS = ['day', 'week', 'month', 'all'] as const;
export type CashPeriod = (typeof CASH_PERIODS)[number];

export const CASH_PERIOD_LABELS: Record<CashPeriod, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  all: 'Tout',
};

export interface CashTransaction {
  id: string;
  type: CashMovementType;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string } | null;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}
