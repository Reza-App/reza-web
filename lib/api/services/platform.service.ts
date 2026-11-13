import { api } from '../client';
import type { Pagination } from '@/lib/types/api';

/** Selia platform administration (SUPER_ADMIN only, enforced by the API). */

export interface PlatformOverview {
  accounts: number;
  activeAccounts: number;
  salons: number;
  activeSalons: number;
  featuredSalons: number;
  newSalonsThisMonth: number;
  activeSubscriptions: number;
  pendingPayments: number;
  revenueThisMonth: number;
  paymentsThisMonth: number;
  clients: number;
  appointmentsThisMonth: number;
}

export interface PlatformSalon {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  isActive: boolean;
  subscriptionActive: boolean;
  featured: boolean;
  createdAt: string;
  appointmentCount: number;
  clientCount: number;
  account: { id: string; isActive: boolean; owner: { email: string; firstName: string; lastName: string } | null } | null;
}

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PlatformPayment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string | null;
  payerName: string | null;
  rejectedReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  account: {
    id: string;
    owner: { email: string; firstName: string; lastName: string } | null;
    salons: { id: string; name: string }[];
    subscription: { status: string; salonsPaid: number; currentPeriodEnd: string | null } | null;
  } | null;
}

export interface EmployeeTier {
  min: number;
  max: number | null;
  price: number;
}

export interface BillingConfig {
  pricePerSalon: number;
  freeEmployeeThreshold: number;
  pricePerEmployee: number;
  employeeTiers: EmployeeTier[] | null;
  currency: string;
  updatedAt?: string;
}

const R = 'backend/superadmin';

export const platformService = {
  overview: (signal?: AbortSignal) => api.get<PlatformOverview>(`${R}/overview`, { signal }),
  salons: (params: { q?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
    api.get<{ salons: PlatformSalon[]; pagination: Pagination }>(`${R}/salons`, { query: params, signal }),
  setFeatured: (salonId: string, featured: boolean) =>
    api.patch<{ id: string; featured: boolean }>(`${R}/salons/${encodeURIComponent(salonId)}/featured`, { featured }),
  setAccountActive: (accountId: string, isActive: boolean) =>
    api.patch<unknown>(`${R}/accounts/${encodeURIComponent(accountId)}`, { isActive }),
  payments: (status: PaymentStatus | undefined, signal?: AbortSignal) =>
    api.get<{ payments: PlatformPayment[]; total: number }>(`${R}/payments`, { query: { status }, signal }),
  approvePayment: (id: string) => api.post<unknown>(`${R}/payments/${encodeURIComponent(id)}/approve`),
  rejectPayment: (id: string, reason?: string) => api.post<unknown>(`${R}/payments/${encodeURIComponent(id)}/reject`, { reason }),
  billing: (signal?: AbortSignal) => api.get<{ config: BillingConfig }>(`${R}/billing-config`, { signal }).then((r) => r.config),
  saveBilling: (config: Omit<BillingConfig, 'updatedAt'>) => api.put<{ config: BillingConfig }>(`${R}/billing-config`, config).then((r) => r.config),
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Validé',
  REJECTED: 'Refusé',
};
