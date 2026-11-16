import { api } from '../client';
import type { Invoice } from './invoice.service';
import type { EmployeeTier } from './platform.service';

export interface SubscriptionBill {
  config: { pricePerSalon: number; freeEmployeeThreshold: number; pricePerEmployee: number; employeeTiers: EmployeeTier[] | null; currency: string };
  salonCount: number;
  salonsDue: number;
  salonFee: number;
  employeeCount: number;
  employeesDue: number;
  employeeFee: number;
  total: number;
  periodActive: boolean;
  /** This bill pays the next period (renewal window or grace days). */
  renewalDue: boolean;
  status: string;
  currentPeriodEnd?: string | null;
  salons: {
    id: string;
    name: string;
    employeeCount: number;
    employeesPaid: number;
    billableEmployees: number;
    salonCovered: boolean;
    salonFee: number;
    employeeFee: number;
    total: number;
    subscriptionActive: boolean;
  }[];
}

export interface BankDetails {
  name?: string | null;
  accountHolder?: string | null;
  rib?: string | null;
  swift?: string | null;
  note?: string | null;
}

export interface SubscriptionOverview {
  bank: BankDetails;
  graceDays: number;
  subscription: { status: string; subscribedAt?: string | null; currentPeriodEnd?: string | null; salonsPaid: number };
  bill: SubscriptionBill;
}

export type SubscriptionPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SubscriptionPayment {
  id: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  reference?: string | null;
  payerName?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
}

export const PAYMENT_STATUS_LABELS: Record<SubscriptionPaymentStatus, string> = {
  PENDING: 'En vérification',
  APPROVED: 'Validé',
  REJECTED: 'Refusé',
};


export const subscriptionService = {
  overview: (signal?: AbortSignal) => api.get<SubscriptionOverview>('backend/subscription', { signal }),
  payments: (signal?: AbortSignal) =>
    api.get<{ payments: SubscriptionPayment[] }>('backend/subscription/payments', { signal }).then((r) => r.payments),
  /** Declares a bank transfer; a Selia administrator approves it. */
  declareTransfer: (input: { amount: number; reference?: string; payerName?: string }) =>
    api.post<{ payment: SubscriptionPayment }>('backend/subscription/declare-payment', input),
  invoices: (signal?: AbortSignal) =>
    api.get<{ invoices: Invoice[] }>('backend/tenant/subscription-invoices', { signal }).then((r) => r.invoices),
};
