import { api } from '../client';
import type { Invoice } from './invoice.service';
import type { Plan, PlanQuote, PricingConfig } from '@/lib/plans';
import type { InvoiceDocumentData } from '@/components/billing/InvoiceDocument';

export interface SubscriptionBill {
  config: { currency: string; pricing: PricingConfig };
  /** Plan and period length this bill is for. */
  plan: Plan;
  months: number;
  /** new: first period or after a lapse; renewal: next period; topup: change during the paid period. */
  mode: 'new' | 'renewal' | 'topup';
  currentPlan: Plan;
  currentMonths: number;
  /** Choice made for the next period, if any. */
  nextPlan: Plan | null;
  nextMonths: number | null;
  /** Set when the chosen plan does not fit (Freelance with a team). */
  planIssue: string | null;
  quotes: PlanQuote[];
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
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  /** During a paid period: months left until its end. */
  remainingMonths: number;
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
    /** During a paid period: collaborators added since the payment and their monthly cost. */
    addedCollaborators: number;
    monthlyDifference: number;
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
  subscription: { status: string; subscribedAt?: string | null; plan: Plan; periodMonths: number; currentPeriodEnd?: string | null; salonsPaid: number };
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
  /** Overview; plan and months preview another choice. */
  overview: (choice: { plan?: Plan; months?: number } = {}, signal?: AbortSignal) =>
    api.get<SubscriptionOverview>('backend/subscription', { query: choice, signal }),
  payments: (signal?: AbortSignal) =>
    api.get<{ payments: SubscriptionPayment[] }>('backend/subscription/payments', { signal }).then((r) => r.payments),
  /** Plan and period length for the next period (at once without a running period). */
  setPlan: (plan: Plan, months: number) => api.put<SubscriptionOverview>('backend/subscription/plan', { plan, months }),
  /** Declares a bank transfer; a Selia administrator approves it. */
  declareTransfer: (input: { amount: number; reference?: string; payerName?: string; plan: Plan; months: number }) =>
    api.post<{ payment: SubscriptionPayment }>('backend/subscription/declare-payment', input),
  invoice: (id: string, signal?: AbortSignal) => api.get<InvoiceDocumentData>('backend/tenant/subscription-invoices/' + encodeURIComponent(id), { signal }),
  invoices: (signal?: AbortSignal) =>
    api.get<{ invoices: Invoice[] }>('backend/tenant/subscription-invoices', { signal }).then((r) => r.invoices),
};
