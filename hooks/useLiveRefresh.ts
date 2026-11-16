'use client';

import { useEffect, useRef } from 'react';

/** What changed on the salon side, as told by the realtime channel. */
export type LiveTopic = 'agenda' | 'reviews' | 'billing' | 'other';

const EVENT = 'selia:live';

/** Topic of a notification type ('APPOINTMENT_NEW' -> 'agenda'). */
export function topicOfNotification(type: string | undefined): LiveTopic {
  if (!type) return 'other';
  if (type.startsWith('APPOINTMENT_')) return 'agenda';
  if (type.startsWith('REVIEW_')) return 'reviews';
  if (type.startsWith('PAYMENT_')) return 'billing';
  return 'other';
}

/** Called by the realtime connection of the top bar. */
export function broadcastLive(topic: LiveTopic) {
  window.dispatchEvent(new CustomEvent<LiveTopic>(EVENT, { detail: topic }));
}

/**
 * Refetches a screen when the salon data it shows changes elsewhere (a client
 * books online, a teammate moves an appointment), and when the tab becomes
 * visible again after a while away.
 */
export function useLiveRefresh(topics: LiveTopic | LiveTopic[], refetch: () => unknown) {
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  }, [refetch]);
  const key = Array.isArray(topics) ? topics.join(',') : topics;

  useEffect(() => {
    const wanted = new Set(key.split(','));
    // Several signals in a row (one per teammate notified) refetch once.
    let timer: number | undefined;
    const onLive = (event: Event) => {
      if (!wanted.has((event as CustomEvent<LiveTopic>).detail)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void latest.current(), 400);
    };
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 30_000) void latest.current();
    };
    window.addEventListener(EVENT, onLive);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(EVENT, onLive);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [key]);
}
