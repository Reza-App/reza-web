import { describe, expect, it } from 'vitest';
import { newUnread } from '@/hooks/useNotificationFeed';
import { safeInternalLink, type AppNotification } from '@/lib/api/services/notification.service';

const n = (id: string, isRead = false) =>
  ({ id, type: 'APPOINTMENT_NEW', title: id, message: '', isRead, createdAt: '2026-11-13T10:00:00Z' }) as AppNotification;

describe('newUnread', () => {
  it('announces nothing on the first load', () => {
    expect(newUnread(null, [n('a'), n('b')])).toEqual([]);
  });

  it('returns only unread notifications not seen before', () => {
    const fresh = newUnread(new Set(['a']), [n('c'), n('b', true), n('a')]);
    expect(fresh.map((x) => x.id)).toEqual(['c']);
  });
});

describe('safeInternalLink', () => {
  it('keeps dashboard links, including the agenda day link', () => {
    expect(safeInternalLink('/dashboard/rendez-vous?view=day&date=2026-11-14')).toBe('/dashboard/rendez-vous?view=day&date=2026-11-14');
  });

  it('refuses external or protocol relative links', () => {
    expect(safeInternalLink('https://evil.example')).toBeNull();
    expect(safeInternalLink('//evil.example')).toBeNull();
    expect(safeInternalLink(null)).toBeNull();
  });
});
