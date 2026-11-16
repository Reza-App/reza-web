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
  /** False for an approved payment whose invoice was never issued. */
  hasInvoice?: boolean | null;
  /** What the payment covers, as computed when it was declared. */
  details?: {
    renewal?: boolean;
    salons?: { id: string; name: string; salonFee: number; employeeFee: number; billableEmployees: number }[];
  } | null;
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
  /** Where salons send their virement. */
  bankName?: string | null;
  bankAccountHolder?: string | null;
  bankRib?: string | null;
  bankSwift?: string | null;
  transferNote?: string | null;
  updatedAt?: string;
}

export interface PlatformNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AccountDetail {
  account: { id: string; isActive: boolean; createdAt: string };
  owner: { id: string; firstName: string; lastName: string; email: string; phone: string | null; createdAt: string } | null;
  subscription: { status: string; subscribedAt: string | null; currentPeriodEnd: string | null; salonsPaid: number } | null;
  graceDays: number;
  bill: { total: number; renewalDue: boolean; currency: string } | null;
  salons: {
    id: string;
    name: string;
    city: string | null;
    slug: string | null;
    isActive: boolean;
    visible: boolean;
    salonCovered: boolean;
    employeesPaid: number;
    featured: boolean;
    createdAt: string;
    employees: number;
    appointments: number;
    clients: number;
  }[];
  payments: {
    id: string;
    amount: number;
    status: PaymentStatus;
    reference: string | null;
    payerName: string | null;
    rejectedReason: string | null;
    createdAt: string;
    approvedAt: string | null;
    approvedBy: { firstName: string; lastName: string } | null;
  }[];
  invoices: { id: string; invoiceNumber: string; total: number; status: string; periodStart: string | null; periodEnd: string | null; paidAt: string | null; createdAt: string }[];
}

export type ReviewTab = 'reported' | 'low' | 'removed' | 'recent';

export interface PlatformReview {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  salon: string;
  accountId: string | null;
  author: string;
  reportedAt: string | null;
  reportReason: string | null;
  platformRemovedAt: string | null;
  platformRemovedReason: string | null;
}

export interface Broadcast {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  audience: string;
  sent: number;
  author: string | null;
}

export interface JournalEntry {
  id: string;
  action: string;
  createdAt: string;
  actor: string | null;
  target: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
}

/** Readable name of each platform action of the journal. */
export const JOURNAL_ACTIONS: Record<string, string> = {
  'platform.payment-approve': 'Virement validé',
  'platform.payment-reject': 'Virement refusé',
  'platform.invoice-issue': 'Facture émise',
  'platform.subscription': 'Abonnement modifié',
  'platform.salon-coverage': 'Activation offerte ou retirée',
  'platform.account': 'Compte activé ou désactivé',
  'platform.featured': 'Mise en avant',
  'platform.client-suspend': 'Client suspendu',
  'platform.client-restore': 'Client rétabli',
  'platform.client-confirm-email': 'Email client confirmé',
  'platform.client-reset-password': 'Lien de mot de passe envoyé',
  'platform.client-anonymize': 'Données client supprimées',
  'platform.admin-create': 'Administrateur ajouté',
  'platform.admin-active': 'Administrateur suspendu ou rétabli',
  'platform.admin-profile': 'Profil modifié',
  'platform.admin-password': 'Mot de passe changé',
  'platform.billing': 'Tarification modifiée',
  'platform.broadcast': 'Message envoyé aux établissements',
  'platform.review-remove': 'Avis retiré',
  'platform.review-restore': 'Avis rétabli',
  'platform.review-dismiss': 'Signalement classé',
};

export interface PlatformClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  createdAt: string;
  emailVerified: boolean;
  suspendedAt: string | null;
  appointments: number;
  reviews: number;
}

export type ClientAction = 'suspend' | 'restore' | 'confirm-email' | 'reset-password' | 'anonymize';

export type WatchState = 'none' | 'canceled' | 'expired' | 'grace' | 'renew' | 'active';

export interface BillingWatch {
  counts: Record<WatchState, number>;
  accounts: {
    accountId: string;
    salons: string[];
    owner: { firstName: string; lastName: string; email: string } | null;
    isActive: boolean;
    state: WatchState;
    currentPeriodEnd: string | null;
    pendingPayment: boolean;
  }[];
  revenue: { month: string; total: number }[];
}

export const WATCH_LABELS: Record<WatchState, { label: string; tone: 'green' | 'amber' | 'red' | 'muted' | 'sky' }> = {
  grace: { label: 'Période de grâce', tone: 'amber' },
  renew: { label: 'À renouveler', tone: 'sky' },
  expired: { label: 'Expiré', tone: 'red' },
  none: { label: 'Jamais activé', tone: 'muted' },
  canceled: { label: 'Résilié', tone: 'muted' },
  active: { label: 'Actif', tone: 'green' },
};

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  accountId: string | null;
  salon: string | null;
  owner: { firstName: string; lastName: string; email: string } | null;
  total: number;
  status: string;
  paymentMethod: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  items: { serviceName: string; price: number }[];
}

export interface PlatformAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

/** Same rule as the API (at least 10 characters, letters and digits). */
export function adminPasswordError(password: string): string | null {
  if (password.length < 10) return 'Au moins 10 caractères.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'Mélangez lettres et chiffres.';
  if (/^(123456|password|motdepasse|azerty)/i.test(password)) return 'Mot de passe trop courant.';
  return null;
}

export type SubscriptionChange = { action: 'extend'; months: number } | { action: 'setEnd'; date: string } | { action: 'cancel' } | { action: 'reactivate' };

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
  reviews: (params: { tab: ReviewTab; page?: number }, signal?: AbortSignal) =>
    api.get<{ reviews: PlatformReview[]; reportedCount: number; pagination: Pagination }>(`${R}/reviews`, { query: params, signal }),
  removeReview: (id: string, reason: string) => api.post<{ success: boolean }>(`${R}/reviews/${encodeURIComponent(id)}/remove`, { reason }),
  reviewAction: (id: string, action: 'restore' | 'dismiss') => api.post<{ success: boolean }>(`${R}/reviews/${encodeURIComponent(id)}/${action}`),
  broadcasts: (signal?: AbortSignal) => api.get<{ messages: Broadcast[] }>(`${R}/broadcasts`, { signal }).then((r) => r.messages),
  sendBroadcast: (input: { title: string; message: string; audience: 'all' | 'visible' }) =>
    api.post<{ sent: number; total: number }>(`${R}/broadcasts`, input),
  journal: (params: { page?: number; action?: string }, signal?: AbortSignal) =>
    api.get<{ entries: JournalEntry[]; pagination: Pagination }>(`${R}/journal`, { query: params, signal }),
  clients: (params: { q?: string; page?: number }, signal?: AbortSignal) =>
    api.get<{ clients: PlatformClient[]; pagination: Pagination }>(`${R}/clients`, { query: params, signal }),
  clientAction: (id: string, action: ClientAction) => api.post<{ success: boolean }>(`${R}/clients/${encodeURIComponent(id)}/${action}`),
  billingWatch: (signal?: AbortSignal) => api.get<BillingWatch>(`${R}/billing-watch`, { signal }),
  invoices: (range: { from?: string; to?: string }, signal?: AbortSignal) =>
    api.get<{ invoices: PlatformInvoice[]; total: number }>(`${R}/invoices`, { query: range, signal }),
  issueInvoice: (paymentId: string) => api.post<{ invoice: { id: string; invoiceNumber: string } }>(`${R}/payments/${encodeURIComponent(paymentId)}/invoice`),
  updateMe: (input: { firstName: string; lastName: string; email: string }) => api.put<{ user: PlatformAdmin }>(`${R}/me`, input),
  changeMyPassword: (input: { currentPassword: string; newPassword: string }) => api.put<{ success: boolean }>(`${R}/me/password`, input),
  admins: (signal?: AbortSignal) => api.get<{ admins: PlatformAdmin[] }>(`${R}/admins`, { signal }).then((r) => r.admins),
  createAdmin: (input: { firstName: string; lastName: string; email: string; password: string }) =>
    api.post<{ admin: PlatformAdmin }>(`${R}/admins`, input),
  setAdminActive: (id: string, isActive: boolean) => api.patch<{ admin: PlatformAdmin }>(`${R}/admins/${encodeURIComponent(id)}`, { isActive }),
  account: (id: string, signal?: AbortSignal) => api.get<AccountDetail>(`${R}/accounts/${encodeURIComponent(id)}/detail`, { signal }),
  changeSubscription: (id: string, change: SubscriptionChange) =>
    api.post<AccountDetail>(`${R}/accounts/${encodeURIComponent(id)}/subscription`, change),
  setSalonCovered: (salonId: string, covered: boolean) =>
    api.patch<AccountDetail>(`${R}/salons/${encodeURIComponent(salonId)}/coverage`, { covered }),
  notifications: (signal?: AbortSignal) =>
    api.get<{ notifications: PlatformNotification[]; unreadCount: number }>(`${R}/notifications`, { query: { limit: 30 }, signal }),
  markNotificationRead: (id: string) => api.patch<unknown>(`${R}/notifications/${encodeURIComponent(id)}/read`),
  markAllNotificationsRead: () => api.patch<unknown>(`${R}/notifications/read-all`),
  saveBilling: (config: Omit<BillingConfig, 'updatedAt'>) => api.put<{ config: BillingConfig }>(`${R}/billing-config`, config).then((r) => r.config),
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Validé',
  REJECTED: 'Refusé',
};
