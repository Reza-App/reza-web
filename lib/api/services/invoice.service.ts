import { api } from '../client';
import type { CashMovementType, CashTransaction, PaymentMethod } from '@/lib/types/cash';
import type { Pagination } from '@/lib/types/api';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'OVERDUE';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'À encaisser',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  OVERDUE: 'En retard',
};

export interface InvoiceItem {
  id: string;
  serviceId?: string | null;
  serviceName: string;
  price: number;
  quantity: number;
  participantName?: string | null;
}

export interface Invoice {
  id: string;
  type: 'SALE' | 'SUBSCRIPTION' | (string & {});
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  client?: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  appointmentId?: string | null;
  items: InvoiceItem[];
}

export interface InvoiceStats {
  totalRevenue: number;
  monthlyRevenue: number;
  invoicesCount: number;
  pendingInvoicesCount: number;
}

export interface SaleInput {
  clientId: string;
  items: { serviceId: string; price?: number; quantity?: number }[];
  paymentMethod: PaymentMethod;
  notes?: string;
  appointmentId?: string;
}

export interface DateRangeQuery {
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
}

const R = 'backend/invoices';
const CASH = 'backend/cash-transactions';

export const invoiceService = {
  list: (query: DateRangeQuery & { status?: InvoiceStatus; type?: string }, signal?: AbortSignal) =>
    api.get<{ invoices: Invoice[] }>(R, { query: { ...query }, signal }).then((r) => r.invoices),
  stats: (signal?: AbortSignal) => api.get<InvoiceStats>(`${R}/stats`, { signal }),
  createSale: (input: SaleInput) => api.post<{ invoice: Invoice }>(`${R}/sale`, input).then((r) => r.invoice),
  markPaid: (id: string, paymentMethod: PaymentMethod) =>
    api.patch<{ invoice: Invoice }>(`${R}/${encodeURIComponent(id)}`, {
      status: 'PAID',
      paymentMethod,
      paidAt: new Date().toISOString(),
    }),
  setStatus: (id: string, status: InvoiceStatus) => api.patch<{ invoice: Invoice }>(`${R}/${encodeURIComponent(id)}`, { status }),
};

export const cashService = {
  list: (query: DateRangeQuery & { type?: CashMovementType; page?: number; limit?: number }, signal?: AbortSignal) =>
    api.get<{ transactions: CashTransaction[]; pagination: Pagination }>(CASH, { query: { limit: 500, ...query }, signal }),
  create: (input: { type: CashMovementType; amount: number; paymentMethod: PaymentMethod; notes?: string }) =>
    api.post<{ transaction: CashTransaction }>(CASH, input),
  remove: (id: string) => api.delete<void>(`${CASH}/${encodeURIComponent(id)}`),
};
