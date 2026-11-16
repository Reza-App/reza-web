import type { BookingInput } from '@/lib/api/services/clientArea.service';
import { normalizePhone } from '@/lib/validation';

/** Most people one client can book for at once (mobile app limit). */
export const MAX_GROUP = 6;

/** Someone the client books for: themself, a saved relative or a one off guest. */
export interface BookingPerson {
  /** 'me', the relative id, or a generated key for a guest. */
  key: string;
  kind: 'me' | 'proche' | 'guest';
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  serviceIds: string[];
  /** Chosen professional per service id ('' = no preference). */
  employees: Record<string, string>;
}

export type ServiceEmployee = { serviceId: string; employeeId: string | null };

export const fullName = (p: Pick<BookingPerson, 'firstName' | 'lastName'>) => [p.firstName, p.lastName].filter(Boolean).join(' ').trim();

export const serviceEmployeesOf = (p: BookingPerson): ServiceEmployee[] =>
  p.serviceIds.map((serviceId) => ({ serviceId, employeeId: p.employees[serviceId] || null }));

/** Everyone has at least one service. */
export const groupReady = (people: BookingPerson[]) => people.length > 0 && people.every((p) => p.serviceIds.length > 0);

/**
 * Body of the free slots request. One person: the plain form (their own
 * bookings excluded when it is the client). Several: every person at the same
 * start time, so a slot is only offered when the whole group fits.
 */
export interface SlotRequest {
  serviceIds: string[];
  serviceEmployees: ServiceEmployee[];
  clientEmail?: string;
  participants?: { serviceIds: string[]; serviceEmployees: ServiceEmployee[] }[];
}

export function slotRequest(people: BookingPerson[], clientEmail?: string): SlotRequest | null {
  const me = people.find((p) => p.kind === 'me');
  const first = people[0];
  if (!first) return null;
  const base = {
    serviceIds: first.serviceIds,
    serviceEmployees: serviceEmployeesOf(first),
    ...(me && clientEmail ? { clientEmail } : {}),
  };
  if (people.length === 1) return base;
  return {
    ...base,
    serviceIds: [...new Set(people.flatMap((p) => p.serviceIds))],
    participants: people.map((p) => ({ serviceIds: p.serviceIds, serviceEmployees: serviceEmployeesOf(p) })),
  };
}

/**
 * Booking request for the whole group, all at the same start time. The client
 * is always the contact; when they are not in the group their own appointment
 * is left out (includeBooker false) and everyone goes in `participants`.
 */
export function buildBooking(args: {
  tenantId: string;
  booker: { firstName: string; lastName: string; email: string; phone: string };
  people: BookingPerson[];
  startTime: string;
  notes?: string;
}): BookingInput {
  const { tenantId, booker, people, startTime, notes } = args;
  const me = people.find((p) => p.kind === 'me');
  const others = people.filter((p) => p.kind !== 'me');
  const lead = me ?? others[0];
  if (!lead) throw new Error('Aucune personne à réserver.');

  const participants = others.map((p) => ({
    name: fullName(p),
    phone: p.phone ? normalizePhone(p.phone) : undefined,
    email: p.email || undefined,
    serviceIds: p.serviceIds,
    serviceEmployees: serviceEmployeesOf(p),
    startTime,
  }));

  return {
    tenantId,
    firstName: booker.firstName,
    lastName: booker.lastName,
    phone: booker.phone,
    email: booker.email,
    serviceIds: lead.serviceIds,
    serviceEmployees: serviceEmployeesOf(lead),
    startTime,
    notes: notes?.trim() || undefined,
    ...(me ? {} : { includeBooker: false }),
    ...(participants.length ? { participants } : {}),
  };
}

/** Runs `fn` on every item, at most `limit` at a time. */
export async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Free start times ("HH:MM") grouped by moment of the day, empty groups left out. */
export function slotsByPeriod(slots: string[]): [string, string[]][] {
  const groups: [string, string[]][] = [
    ['Matin', slots.filter((t) => t < '12:00')],
    ['Après midi', slots.filter((t) => t >= '12:00' && t < '17:00')],
    ['Soir', slots.filter((t) => t >= '17:00')],
  ];
  return groups.filter(([, list]) => list.length > 0);
}
