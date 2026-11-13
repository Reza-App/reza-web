import { api } from '../client';
import type { Invoice } from './invoice.service';

export interface SubscriptionBill {
  config: { pricePerSalon: number; freeEmployeeThreshold: number; pricePerEmployee: number; currency: string };
  salonCount: number;
  salonsDue: number;
  salonFee: number;
  employeeCount: number;
  employeesDue: number;
  employeeFee: number;
  total: number;
  periodActive: boolean;
  status: string;
  currentPeriodEnd?: string | null;
  salons: { id: string; name: string; employeeCount: number; salonFee: number; employeeFee: number; total: number; subscriptionActive: boolean }[];
}

export interface SubscriptionOverview {
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

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  TRIAL: "Période d'essai",
  PAST_DUE: 'En retard de paiement',
  EXPIRED: 'Expiré',
  CANCELLED: 'Résilié',
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
