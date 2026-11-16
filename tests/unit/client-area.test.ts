import { describe, expect, it } from 'vitest';
import { isAllowedClientPath, requiresClientSession, resolveClientPath } from '@/lib/server/clientAllowlist';
import { arrangeSalons, groupServices, openingHours, servicePrice, splitAppointments } from '@/lib/clientSalon';
import { readClientEmail } from '@/lib/session';
import { safeClientNext } from '@/lib/validation';
import type { ClientAppointment, SalonCard, SalonService } from '@/lib/api/services/clientArea.service';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (claims: object) => `${b64({ alg: 'HS256' })}.${b64(claims)}.sig`;

describe('client BFF allowlist', () => {
  it('lets discovery and account routes through, with the right methods', () => {
    expect(isAllowedClientPath(['tenants'], 'GET')).toBe(true);
    expect(isAllowedClientPath(['tenant', 'atelier-noor', 'services'], 'GET')).toBe(true);
    expect(isAllowedClientPath(['tenant', 'x', 'available-slots'], 'POST')).toBe(true);
    expect(isAllowedClientPath(['bookings'], 'POST')).toBe(true);
    expect(isAllowedClientPath(['client', 'me', 'appointments'], 'GET')).toBe(true);
    expect(isAllowedClientPath(['favorites', 'f1'], 'DELETE')).toBe(true);
  });

  it('refuses other routes, methods and traversal', () => {
    expect(isAllowedClientPath(['tenants'], 'POST')).toBe(false);
    expect(isAllowedClientPath(['client', 'someone@x.ma', 'appointments'], 'GET')).toBe(false);
    expect(isAllowedClientPath(['auth', 'client-login'], 'POST')).toBe(false);
    expect(isAllowedClientPath(['early-access'], 'POST')).toBe(false);
    expect(isAllowedClientPath(['tenant', '..', 'services'], 'GET')).toBe(false);
  });

  it('only addresses the signed in client', () => {
    expect(resolveClientPath(['client', 'me', 'favorites'], 'nour@x.ma')).toEqual(['client', 'nour@x.ma', 'favorites']);
    expect(resolveClientPath(['client', 'me'], null)).toBeNull();
    expect(requiresClientSession(['bookings'], 'POST')).toBe(true);
    expect(requiresClientSession(['tenants'], 'GET')).toBe(false);
  });

  it('reads the email of a client token only', () => {
    expect(readClientEmail(token({ role: 'CLIENT', email: 'Nour@X.ma' }))).toBe('nour@x.ma');
    expect(readClientEmail(token({ role: 'ADMIN', email: 'a@b.ma' }))).toBeNull();
    expect(readClientEmail(undefined)).toBeNull();
  });

  it('keeps redirects inside the client area', () => {
    expect(safeClientNext('/client/rendez-vous')).toBe('/client/rendez-vous');
    expect(safeClientNext('/dashboard')).toBe('/client');
    expect(safeClientNext('//evil.example')).toBe('/client');
  });
});

describe('salon helpers', () => {
  it('reads opening hours in both stored formats', () => {
    const current = openingHours({
      schedules: [{ day: 'Mardi', isOpen: true, openTime: '10:00', closeTime: '20:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    });
    expect(current.find((d) => d.day === 'Mardi')?.label).toBe('10:00 à 12:00, 13:00 à 20:00');
    expect(current.find((d) => d.day === 'Lundi')?.label).toBeNull();
    const legacy = openingHours({ lundi: { open: '09:00', close: '19:00' } });
    expect(legacy[0]).toEqual({ day: 'Lundi', label: '09:00 à 19:00' });
    expect(openingHours({})).toEqual([]);
  });

  it('formats prices and groups bookable services', () => {
    expect(servicePrice({ price: 0, onQuote: true })).toBe('Sur devis');
    expect(servicePrice({ priceType: 'FROM', priceFrom: 200 })).toMatch(/^Dès/);
    const groups = groupServices([
      { id: 'a', name: 'A', duration: 30, category: 'Coiffure' },
      { id: 'b', name: 'B', duration: 30, category: 'Coiffure', visibility: 'HIDDEN' },
      { id: 'c', name: 'C', duration: 30 },
    ] as SalonService[]);
    expect(groups.map(([k, v]) => [k, v.length])).toEqual([
      ['Coiffure', 1],
      ['Prestations', 1],
    ]);
  });

  it('splits appointments into upcoming, past and cancelled', () => {
    const now = Date.parse('2026-11-13T12:00:00Z');
    const a = (id: string, status: string, startTime: string) => ({ id, status, startTime }) as ClientAppointment;
    const { upcoming, past, cancelled } = splitAppointments(
      [a('1', 'confirmed', '2026-11-20T10:00:00Z'), a('2', 'completed', '2026-11-01T10:00:00Z'), a('3', 'cancelled', '2026-11-25T10:00:00Z'), a('4', 'pending', '2026-11-02T10:00:00Z')],
      now,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['1']);
    // Most recent first.
    expect(past.map((x) => x.id)).toEqual(['4', '2']);
    expect(cancelled.map((x) => x.id)).toEqual(['3']);
  });
});

describe('arrangeSalons', () => {
  const salon = (id: string, rating: number | null, min: number | null, online = true) =>
    ({ id, name: id, rating, reviews: 1, priceRange: min === null ? null : { min, max: min, avg: min }, onlineReservationEnabled: online }) as SalonCard;
  const list = [salon('a', 4.2, 300), salon('b', 4.9, null), salon('c', 3.5, 100, false)];

  it('sorts by rating and by price, salons without price last', () => {
    expect(arrangeSalons(list, 'note', false).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(arrangeSalons(list, 'prix-asc', false).map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(arrangeSalons(list, 'prix-desc', false).map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps online booking salons only when asked, without touching the input', () => {
    expect(arrangeSalons(list, 'pertinence', true).map((s) => s.id)).toEqual(['a', 'b']);
    expect(list.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});
