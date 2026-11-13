import { api } from '../client';

export type NotificationType =
  | 'REVIEW_PENDING'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REJECTED'
  | 'APPOINTMENT_NEW'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'PAYMENT_DECLARED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  notifications: AppNotification[];
  grouped: Record<'today' | 'yesterday' | 'thisWeek' | 'older', AppNotification[]>;
  unreadCount: number;
}

const R = 'backend/notifications';

export const notificationService = {
  /** Latest 50 notifications (the backend caps a page at 100). */
  feed: (signal?: AbortSignal) => api.get<NotificationFeed>(R, { query: { limit: 50 }, signal }),
  markRead: (id: string) => api.patch<void>(`${R}/${encodeURIComponent(id)}/read`),
  markAllRead: () => api.patch<void>(`${R}/read-all`),
  clear: () => api.delete<void>(R),
};

/** Only same app links are followed (the link comes from the database). */
export function safeInternalLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null;
  return link;
}
