export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'RECEPTIONIST' | (string & {});

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  role: StaffRole;
  tenantId: string;
  tenant?: { id: string; name: string; logo?: string | null } | null;
}

export interface SalonSummary {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  category?: string | null;
  coverImage?: string | null;
  subscriptionActive?: boolean;
}

export interface SubscriptionSummary {
  status: string;
  salonsPaid?: number;
  currentPeriodEnd?: string | null;
}

export interface Session {
  user: SessionUser;
  salons: SalonSummary[];
  activeTenantId: string;
  subscription?: SubscriptionSummary | null;
}

export const ADMIN_ROLES: readonly StaffRole[] = ['ADMIN', 'SUPER_ADMIN'];

export function isAdmin(user: Pick<SessionUser, 'role'> | null | undefined): boolean {
  return !!user && ADMIN_ROLES.includes(user.role);
}

export function fullName(user: Pick<SessionUser, 'firstName' | 'lastName'> | null | undefined): string {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
