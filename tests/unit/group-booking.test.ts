import { describe, expect, it } from 'vitest';
import { type BookingPerson, buildBooking, groupReady, mapLimit, slotRequest, slotsByPeriod } from '@/lib/groupBooking';
import { salonLocation } from '@/lib/clientSalon';

const me: BookingPerson = { key: 'me', kind: 'me', firstName: 'Moi', lastName: '', serviceIds: ['s1'], employees: { s1: 'e1' } };
const sara: BookingPerson = { key: 'f1', kind: 'proche', firstName: 'Sara', lastName: 'Benali', phone: '0612345678', serviceIds: ['s2'], employees: {} };
const guest: BookingPerson = { key: 'guest-1', kind: 'guest', firstName: 'Lina', lastName: '', serviceIds: ['s1', 's2'], employees: { s2: 'e2' } };
const booker = { firstName: 'Nour', lastName: 'Benali', email: 'nour@example.com', phone: '+212600000000' };
const startTime = '2026-11-20T10:00:00';

describe('group booking', () => {
  it('needs a service for every person', () => {
    expect(groupReady([me, sara])).toBe(true);
    expect(groupReady([me, { ...sara, serviceIds: [] }])).toBe(false);
    expect(groupReady([])).toBe(false);
  });

  it('asks slots for one person the plain way, own bookings excluded only for the client', () => {
    expect(slotRequest([me], 'nour@example.com')).toEqual({ serviceIds: ['s1'], serviceEmployees: [{ serviceId: 's1', employeeId: 'e1' }], clientEmail: 'nour@example.com' });
    expect(slotRequest([sara], 'nour@example.com')).toEqual({ serviceIds: ['s2'], serviceEmployees: [{ serviceId: 's2', employeeId: null }] });
  });

  it('asks slots for the whole group at the same time', () => {
    const req = slotRequest([me, guest], 'nour@example.com');
    expect(req?.participants).toEqual([
      { serviceIds: ['s1'], serviceEmployees: [{ serviceId: 's1', employeeId: 'e1' }] },
      { serviceIds: ['s1', 's2'], serviceEmployees: [{ serviceId: 's1', employeeId: null }, { serviceId: 's2', employeeId: 'e2' }] },
    ]);
    expect(req?.serviceIds).toEqual(['s1', 's2']);
    expect(req?.clientEmail).toBe('nour@example.com');
  });

  it('books the client and their guests together', () => {
    const body = buildBooking({ tenantId: 't1', booker, people: [me, sara, guest], startTime, notes: '  ' });
    expect(body.includeBooker).toBeUndefined();
    expect(body.serviceIds).toEqual(['s1']);
    expect(body.notes).toBeUndefined();
    expect(body.participants).toEqual([
      { name: 'Sara Benali', phone: '0612345678', email: undefined, serviceIds: ['s2'], serviceEmployees: [{ serviceId: 's2', employeeId: null }], startTime },
      { name: 'Lina', phone: undefined, email: undefined, serviceIds: ['s1', 's2'], serviceEmployees: [{ serviceId: 's1', employeeId: null }, { serviceId: 's2', employeeId: 'e2' }], startTime },
    ]);
  });

  it('keeps the client as contact only when they are not in the group', () => {
    const body = buildBooking({ tenantId: 't1', booker, people: [sara], startTime });
    expect(body.includeBooker).toBe(false);
    expect(body.firstName).toBe('Nour');
    expect(body.participants).toHaveLength(1);
    expect(body.participants![0]!.name).toBe('Sara Benali');
  });
});

describe('booking helpers', () => {
  it('groups free times by moment of the day', () => {
    expect(slotsByPeriod(['09:00', '11:30', '12:00', '16:30', '17:00'])).toEqual([
      ['Matin', ['09:00', '11:30']],
      ['Après midi', ['12:00', '16:30']],
      ['Soir', ['17:00']],
    ]);
    expect(slotsByPeriod(['14:00'])).toEqual([['Après midi', ['14:00']]]);
  });

  it('runs every item without exceeding the limit', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      done.push(n);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(peak).toBe(2);
  });

  it('writes the city once', () => {
    expect(salonLocation('19 Rue des Orangers, Casablanca', 'Casablanca')).toBe('19 Rue des Orangers, Casablanca');
    expect(salonLocation('19 Rue des Orangers', 'Casablanca')).toBe('19 Rue des Orangers, Casablanca');
    expect(salonLocation('16 rue des Orangers, fès', 'Fès')).toBe('16 rue des Orangers, fès');
    expect(salonLocation(null, 'Rabat')).toBe('Rabat');
    expect(salonLocation('', '')).toBe('');
  });
});
