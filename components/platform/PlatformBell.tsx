'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, CreditCard } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useToast } from '@/components/ui/toast';
import { type PlatformNotification, platformService } from '@/lib/api/services/platform.service';
import { safeInternalLink } from '@/lib/api/services/notification.service';
import { formatRelative } from '@/lib/format';

const POLL_MS = 30_000;

/** Older notifications pointed to the former admin URL. */
const linkOf = (n: PlatformNotification) =>
  n.type.startsWith('PAYMENT') ? '/plateforme/paiements' : safeInternalLink(n.link);

/**
 * Bell of the platform area: virements declared by salons, refreshed every
 * 30 s while the tab is visible and when it comes back. A new arrival shows a
 * toast (never on the first load).
 */
export function PlatformBell() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const query = useApiQuery('platform-notifications', (signal) => platformService.notifications(signal));
  const { refetch, data } = query;
  const unread = data?.unreadCount ?? 0;
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && void refetch();
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refetch]);

  useEffect(() => {
    if (!data) return;
    const fresh = seen.current ? data.notifications.filter((n) => !n.isRead && !seen.current!.has(n.id)) : [];
    if (fresh.length === 1) toast.info(fresh[0]!.title);
    else if (fresh.length > 1) toast.info(`${fresh.length} nouvelles notifications`);
    seen.current = new Set(data.notifications.map((n) => n.id));
  }, [data, toast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openOne = async (n: PlatformNotification) => {
    if (!n.isRead) await platformService.markNotificationRead(n.id).catch(() => undefined);
    setOpen(false);
    void refetch();
    const link = linkOf(n);
    if (link) router.push(link);
  };

  const readAll = async () => {
    await platformService.markAllNotificationsRead().catch(() => undefined);
    void refetch();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          void refetch();
        }}
        className="relative rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fadeUp absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <p className="text-sm font-medium text-neutral-950">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void readAll()} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950">
                <CheckCheck size={14} /> Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {(data?.notifications ?? []).length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-neutral-500">Aucune notification.</li>
            ) : (
              data!.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openOne(n)}
                    className={`flex w-full gap-3 border-b border-neutral-100 px-5 py-3.5 text-left last:border-b-0 hover:bg-neutral-50 ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      {n.type.startsWith('PAYMENT') ? <CreditCard size={15} /> : <Bell size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-neutral-950">{n.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-neutral-600">{n.message}</span>
                      <span className="mt-1 block text-[11px] text-neutral-400">{formatRelative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
