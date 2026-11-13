/**
 * Colour of each status badge, so a state reads the same everywhere:
 * green = done or paid, amber = to follow, sky = planned, violet = ongoing,
 * red = cancelled or refused, grey = inactive.
 */
export type StatusTone = 'green' | 'amber' | 'red' | 'violet' | 'sky' | 'muted';

export const APPOINTMENT_STATUS_TONES: Record<string, StatusTone> = {
  PENDING: 'amber',
  CONFIRMED: 'sky',
  IN_PROGRESS: 'violet',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'muted',
};

export const INVOICE_STATUS_TONES: Record<string, StatusTone> = {
  PENDING: 'amber',
  PAID: 'green',
  OVERDUE: 'red',
  REFUNDED: 'violet',
  CANCELLED: 'muted',
};

export const PAYMENT_STATUS_TONES: Record<string, StatusTone> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
};

export const CLIENT_STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: 'green',
  INACTIVE: 'muted',
  BLOCKED: 'red',
};

export function statusTone(map: Record<string, StatusTone>, status: string | null | undefined): StatusTone {
  return (status && map[status]) || 'muted';
}

/** Small dot of the same colour, for filters and legends. */
export const STATUS_DOT: Record<StatusTone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  muted: 'bg-neutral-400',
};
