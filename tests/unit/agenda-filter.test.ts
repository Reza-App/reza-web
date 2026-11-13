import { describe, expect, it } from 'vitest';
import { involvesEmployee } from '@/lib/agenda';
import type { Appointment } from '@/lib/types/appointment';

const appt = (mainId: string | null, serviceIds: string[]) =>
  ({
    employee: mainId ? { id: mainId, firstName: 'A', lastName: 'B' } : null,
    services: serviceIds.map((id, i) => ({ id: `s${i}`, serviceId: 'x', name: 'x', duration: 30, price: 0, employee: { id, firstName: 'A', lastName: 'B' } })),
  }) as unknown as Appointment;

describe('involvesEmployee', () => {
  it('matches the linked user account, not only the employee id', () => {
    const employee = { id: 'emp-1', userId: 'user-1' };
    expect(involvesEmployee(appt('user-1', []), employee)).toBe(true);
    expect(involvesEmployee(appt(null, ['user-2', 'user-1']), employee)).toBe(true);
    expect(involvesEmployee(appt('emp-1', []), employee)).toBe(true);
  });

  it('ignores appointments of other employees', () => {
    expect(involvesEmployee(appt('user-2', ['user-3']), { id: 'emp-1', userId: 'user-1' })).toBe(false);
  });
});
