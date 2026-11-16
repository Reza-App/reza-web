import { describe, expect, it } from 'vitest';
import {
  atTime,
  formatDuration,
  formatMoney,
  parseISODate,
  personName,
  startOfWeek,
  toISODate,
} from '@/lib/format';
import { errorSummary, hasErrors, isValidEmail, isValidPhone, normalizePhone, validate } from '@/lib/validation';
import { monthGrid, parseAgendaFilters, rangeQuery, shiftDate } from '@/lib/agenda';

describe('format', () => {
  it('formats dirhams', () => {
    expect(formatMoney(1250).replace(/\s/g, ' ')).toBe('1 250 DH');
    expect(formatMoney(undefined)).toBe('0 DH');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(150)).toBe('2 h 30');
  });

  it('keeps calendar dates local (no UTC shift)', () => {
    const d = parseISODate('2026-01-02');
    expect(d.getDate()).toBe(2);
    expect(toISODate(d)).toBe('2026-01-02');
  });

  it('finds the Monday of a week, Sunday included', () => {
    expect(toISODate(startOfWeek(parseISODate('2026-11-15')))).toBe('2026-11-09');
    expect(toISODate(startOfWeek(parseISODate('2026-11-09')))).toBe('2026-11-09');
  });

  it('combines a date and a time', () => {
    const d = atTime(parseISODate('2026-11-13'), '14:30');
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('joins person names', () => {
    expect(personName({ firstName: 'Nour', lastName: 'Benali' })).toBe('Nour Benali');
    expect(personName(null)).toBe('');
  });
});

describe('validation', () => {
  it('checks Moroccan phone numbers like the backend', () => {
    expect(isValidPhone('06 12 34 56 78')).toBe(true);
    expect(isValidPhone('+212612345678')).toBe(true);
    expect(isValidPhone('612345678')).toBe(false);
    expect(isValidPhone('+33612345678')).toBe(false);
    expect(normalizePhone('(06) 12.34.56.78')).toBe('0612345678');
  });

  it('checks emails', () => {
    expect(isValidEmail('a@b.ma')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('collects the failing rules', () => {
    const errors = validate({ a: () => null, b: () => 'oops' });
    expect(errors).toEqual({ b: 'oops' });
    expect(hasErrors(errors)).toBe(true);
    expect(hasErrors({})).toBe(false);
  });
});

describe('agenda', () => {
  const params = (o: Record<string, string>) => (k: string) => o[k] ?? null;

  it('reads filters from the URL with safe defaults', () => {
    const today = parseISODate('2026-11-13');
    expect(parseAgendaFilters(params({}), today)).toMatchObject({ view: 'month', employeeId: null, status: null });
    const f = parseAgendaFilters(params({ view: 'month', date: '2026-02-03', status: 'CONFIRMED', employee: 'e1' }), today);
    expect(f.view).toBe('month');
    expect(toISODate(f.date)).toBe('2026-02-03');
    expect(f.status).toBe('CONFIRMED');
    expect(f.employeeId).toBe('e1');
  });

  it('ignores invalid values', () => {
    const f = parseAgendaFilters(params({ view: 'year', date: 'yesterday', status: 'DROP TABLE' }));
    expect(f.view).toBe('month');
    expect(f.status).toBeNull();
  });

  it('computes the visible range of each view', () => {
    const d = parseISODate('2026-11-13');
    expect(rangeQuery('day', d)).toEqual({ startDate: '2026-11-13', endDate: '2026-11-13' });
    expect(rangeQuery('week', d)).toEqual({ startDate: '2026-11-09', endDate: '2026-11-15' });
    expect(rangeQuery('month', d)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-30' });
  });

  it('navigates by view', () => {
    const d = parseISODate('2026-01-31');
    expect(toISODate(shiftDate('day', d, 1))).toBe('2026-02-01');
    expect(toISODate(shiftDate('week', d, -1))).toBe('2026-01-24');
    expect(toISODate(shiftDate('month', d, 1))).toBe('2026-02-01');
  });

  it('starts the month grid on Monday', () => {
    const grid = monthGrid(parseISODate('2026-11-13'));
    // 1 Nov 2026 is a Sunday: six empty cells first.
    expect(grid.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(grid[6]?.getDate()).toBe(1);
    expect(grid.filter(Boolean)).toHaveLength(30);
  });
});

describe('layoutDay', () => {
  const ev = (s: string, e: string) => ({ startTime: `2026-11-13T${s}:00`, endTime: `2026-11-13T${e}:00` });
  // local ISO strings without zone are parsed as local time

  it('positions events from the grid start', async () => {
    const { layoutDay } = await import('@/lib/agenda');
    const [p] = layoutDay([ev('09:30', '10:30')], 8 * 60);
    expect(p.top).toBe(90);
    expect(p.height).toBe(60);
    expect(p.lanes).toBe(1);
  });

  it('puts overlapping events side by side and reuses free lanes', async () => {
    const { layoutDay } = await import('@/lib/agenda');
    const placed = layoutDay([ev('09:00', '11:00'), ev('09:30', '10:00'), ev('10:00', '10:30'), ev('12:00', '13:00')], 0);
    const byStart = (s: string) => placed.find((p) => p.item.startTime.includes(s))!;
    expect(byStart('09:00').lane).toBe(0);
    expect(byStart('09:30').lane).toBe(1);
    expect(byStart('10:00').lane).toBe(1);
    expect(byStart('09:00').lanes).toBe(2);
    expect(byStart('12:00').lanes).toBe(1);
  });
});

describe('errorSummary', () => {
  const labels = { firstName: 'Prénom', phone: 'Téléphone', email: 'Email' };
  it('names the fields to fix, or nothing', () => {
    expect(errorSummary({}, labels)).toBeNull();
    expect(errorSummary({ phone: 'x' }, labels)).toBe('Vérifiez le champ Téléphone.');
    expect(errorSummary({ firstName: 'x', email: 'y' }, labels)).toBe('Vérifiez les champs : Prénom, Email.');
  });
});
