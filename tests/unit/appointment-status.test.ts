import { describe, expect, it } from 'vitest';
import { canChangeStatus, statusActions, statusHint } from '@/lib/appointmentStatus';

const start = new Date('2026-11-20T10:00:00Z');
const before = new Date('2026-11-20T08:00:00Z').getTime();
const after = new Date('2026-11-20T11:00:00Z').getTime();
const labels = (s: Parameters<typeof statusActions>[0], now: number) => statusActions(s, start, now).map((a) => a.label);

describe('appointment status actions', () => {
  it('only confirms a coming request', () => {
    expect(labels('PENDING', before)).toEqual(['Confirmer']);
    expect(labels('CONFIRMED', before)).toEqual([]);
    expect(statusHint('CONFIRMED', start, before)).toMatch(/heure du rendez vous/);
  });

  it('offers start, finish and no show once it is time', () => {
    expect(labels('CONFIRMED', after)).toEqual(['Client absent', 'Démarrer', 'Terminer']);
    expect(labels('IN_PROGRESS', after)).toEqual(['Annuler le démarrage', 'Terminer']);
  });

  it('undoes mistakes and restores only coming appointments', () => {
    expect(labels('COMPLETED', after)).toEqual(['Annuler « terminé »']);
    expect(labels('NO_SHOW', after)).toEqual(['Annuler « absent »']);
    expect(labels('CANCELLED', before)).toEqual(['Restaurer']);
    expect(labels('CANCELLED', after)).toEqual([]);
  });

  it('never cancels a finished or missed visit', () => {
    expect(canChangeStatus('COMPLETED', 'CANCELLED', start, after)).toBe(false);
    expect(canChangeStatus('NO_SHOW', 'CANCELLED', start, after)).toBe(false);
    expect(canChangeStatus('CONFIRMED', 'CANCELLED', start, before)).toBe(true);
  });
});

describe('start window', () => {
  const end = new Date('2026-11-20T11:00:00Z');
  it('no longer offers to start once the end time is past', () => {
    const during = new Date('2026-11-20T10:30:00Z').getTime();
    const later = new Date('2026-11-20T16:00:00Z').getTime();
    expect(statusActions('CONFIRMED', start, during, end).map((a) => a.label)).toEqual(['Client absent', 'Démarrer', 'Terminer']);
    expect(statusActions('CONFIRMED', start, later, end).map((a) => a.label)).toEqual(['Client absent', 'Terminer']);
  });
});
