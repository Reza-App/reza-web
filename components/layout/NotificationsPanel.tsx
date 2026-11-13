'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, CreditCard, MessageSquareText, X } from 'lucide-react';
import {
  type AppNotification,
  type NotificationFeed,
  notificationService,
  safeInternalLink,
} from '@/lib/api/services/notification.service';
import { formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api/errors';

const GROUPS: { key: keyof NotificationFeed['grouped']; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'thisWeek', label: 'Cette semaine' },
  { key: 'older', label: 'Plus ancien' },
];

/** Icon tint by meaning, same palette as the status badges. */
function toneFor(type: AppNotification['type']): string {
  if (type === 'APPOINTMENT_CANCELLED' || type === 'PAYMENT_REJECTED' || type === 'REVIEW_REJECTED') return 'bg-red-50 text-red-700';
  if (type === 'APPOINTMENT_CONFIRMED' || type === 'PAYMENT_APPROVED' || type === 'REVIEW_APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (type === 'APPOINTMENT_NEW') return 'bg-sky-50 text-sky-700';
  if (type === 'REVIEW_PENDING' || type === 'PAYMENT_DECLARED' || type === 'APPOINTMENT_REMINDER') return 'bg-amber-50 text-amber-700';
  return 'bg-neutral-100 text-neutral-700';
}

function iconFor(type: AppNotification['type']) {
  if (type.startsWith('APPOINTMENT')) return CalendarDays;
  if (type.startsWith('REVIEW')) return MessageSquareText;
  if (type.startsWith('PAYMENT')) return CreditCard;
  return Bell;
}

export function NotificationsPanel({
  feed,
  onClose,
  onChanged,
}: {
  feed: NotificationFeed | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  const open = async (item: AppNotification) => {
    if (!item.isRead) {
      await notificationService.markRead(item.id).catch(() => undefined);
      onChanged();
    }
    const link = safeInternalLink(item.link);
    if (link) {
      onClose();
      router.push(link);
    }
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const unread = feed?.unreadCount ?? 0;
  const visible = (items: AppNotification[]) => (tab === 'unread' ? items.filter((n) => !n.isRead) : items);
  const isEmpty = !feed || GROUPS.every((g) => visible(feed.grouped[g.key] ?? []).length === 0);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="animate-slideIn fixed right-0 top-0 z-[60] flex h-screen w-[440px] max-w-full flex-col bg-white shadow-2xl"
    >
      <div className="border-b border-neutral-100 px-7 py-7">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-medium text-neutral-950">Notifications</h2>
            <p className="mt-1 text-sm text-neutral-500">{unread === 0 ? 'Tout est lu' : `${unread} non lue${unread > 1 ? 's' : ''}`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-1 text-xs font-medium">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 transition-colors ${tab === t ? 'bg-neutral-950 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
            >
              {t === 'all' ? 'Toutes' : 'Non lues'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="px-7 py-16 text-center text-sm text-neutral-500">Aucune notification.</p>
        ) : (
          GROUPS.map((group) => {
            const items = visible(feed!.grouped[group.key] ?? []);
            if (items.length === 0) return null;
            return (
              <section key={group.key} className="border-b border-neutral-100 px-7 py-5 last:border-b-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{group.label}</p>
                <ul className="space-y-2">
                  {items.map((item) => {
                    const Icon = iconFor(item.type);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => open(item)}
                          className={`relative flex w-full gap-4 rounded-xl border border-neutral-100 p-4 text-left transition hover:border-neutral-300 ${
                            item.isRead ? 'opacity-60 hover:opacity-100' : ''
                          }`}
                        >
                          {!item.isRead && <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-neutral-950" />}
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneFor(item.type)}`}>
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1 pr-3">
                            <span className="mb-1 block text-sm font-medium text-neutral-950">{item.title}</span>
                            <span className="mb-1.5 block text-xs leading-relaxed text-neutral-600">{item.message}</span>
                            <span className="text-xs text-neutral-400">{formatRelative(item.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <div className="border-t border-neutral-100 p-5">
        <button
          type="button"
          onClick={markAll}
          disabled={unread === 0}
          className="w-full rounded-full py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
        >
          Tout marquer comme lu
        </button>
      </div>
    </div>
  );
}
