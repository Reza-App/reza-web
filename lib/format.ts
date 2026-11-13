/** Formatting helpers shared by every page (French locale, Moroccan dirham). */

const LOCALE = 'fr-FR';

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | null | undefined): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;
  return `${moneyFormatter.format(amount)} DH`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  const n = Number.isFinite(value) ? (value as number) : 0;
  return n.toLocaleString(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  return `${formatNumber(value, digits)} %`;
}

export function formatDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(minutes ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Local calendar date as YYYY-MM-DD (never shifted by UTC conversion). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as a LOCAL date (Date('2026-01-02') would be UTC). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** HH:mm of a date in local time. */
export function toTimeLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Combines a local date and a HH:mm string into a Date. */
export function atTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LOCALE, options ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(date)} ${toTimeLabel(date)}`;
}

/** "Il y a 5 min", "Hier à 14:15"... for notification feeds. */
export function formatRelative(value: string | Date, now = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (isSameDay(date, now)) return `Il y a ${Math.floor(diffMin / 60)} h`;
  if (isSameDay(date, addDays(now, -1))) return `Hier à ${toTimeLabel(date)}`;
  return formatDateTime(date);
}

export function personName(person: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!person) return '';
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
