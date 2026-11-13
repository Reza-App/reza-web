import { describe, expect, it } from 'vitest';
import { clampPage, pageRange, totalPagesFor } from '@/lib/pagination';
import { APPOINTMENT_STATUS_TONES, statusTone } from '@/lib/status';

describe('pagination', () => {
  it('counts pages, with at least one', () => {
    expect(totalPagesFor(0, 10)).toBe(1);
    expect(totalPagesFor(10, 10)).toBe(1);
    expect(totalPagesFor(11, 10)).toBe(2);
  });

  it('keeps the page inside the bounds', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(Number.NaN, 5)).toBe(1);
  });

  it('lists every page when there are few', () => {
    expect(pageRange(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses distant pages into gaps', () => {
    expect(pageRange(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageRange(1, 12)).toEqual([1, 2, 'gap', 12]);
    expect(pageRange(12, 12)).toEqual([1, 'gap', 11, 12]);
  });
});

describe('status tones', () => {
  it('colours known statuses and falls back to grey', () => {
    expect(statusTone(APPOINTMENT_STATUS_TONES, 'COMPLETED')).toBe('green');
    expect(statusTone(APPOINTMENT_STATUS_TONES, 'UNKNOWN')).toBe('muted');
    expect(statusTone(APPOINTMENT_STATUS_TONES, null)).toBe('muted');
  });
});
