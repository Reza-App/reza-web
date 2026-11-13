'use client';

import { useEffect, useRef } from 'react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { useToast } from '@/components/ui/toast';
import { type AppNotification, notificationService } from '@/lib/api/services/notification.service';

/** Safety net only: the realtime channel normally delivers at once. */
const POLL_MS = 30_000;
const POLL_CONNECTED_MS = 120_000;

/** Unread notifications not seen in the previous feed (pure, for tests). */
export function newUnread(previous: ReadonlySet<string> | null, items: readonly AppNotification[]): AppNotification[] {
  if (!previous) return [];
  return items.filter((n) => !n.isRead && !previous.has(n.id));
}

/**
 * Notification feed of the top bar: refreshed at once on the realtime signal,
 * otherwise every 30 s (2 min while realtime is connected) when the tab is
 * visible, and when the tab comes back. New arrivals show a toast (never on
 * the first load).
 */
export function useNotificationFeed(key: string | null) {
  const toast = useToast();
  const query = useApiQuery(key, (signal) => notificationService.feed(signal));
  const { refetch, data } = query;
  const seen = useRef<Set<string> | null>(null);
  const { connected } = useRealtime(key, () => void refetch());

  useEffect(() => {
    if (!key) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    const id = window.setInterval(tick, connected ? POLL_CONNECTED_MS : POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [key, refetch, connected]);

  // A new salon starts with a fresh history: no toast for what it already has.
  useEffect(() => {
    seen.current = null;
  }, [key]);

  useEffect(() => {
    if (!data) return;
    const fresh = newUnread(seen.current, data.notifications);
    if (fresh.length === 1) toast.info(fresh[0]!.title);
    else if (fresh.length > 1) toast.info(`${fresh.length} nouvelles notifications`);
    seen.current = new Set(data.notifications.map((n) => n.id));
  }, [data, toast]);

  return query;
}
