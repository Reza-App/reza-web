import type { ClientAppointment, SalonCard, SalonService } from './api/services/clientArea.service';
import { formatMoney } from './format';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const LEGACY_KEYS: Record<string, string[]> = {
  Lundi: ['lundi', 'monday'],
  Mardi: ['mardi', 'tuesday'],
  Mercredi: ['mercredi', 'wednesday'],
  Jeudi: ['jeudi', 'thursday'],
  Vendredi: ['vendredi', 'friday'],
  Samedi: ['samedi', 'saturday'],
  Dimanche: ['dimanche', 'sunday'],
};

export interface DayHours {
  day: string;
  label: string | null;
}

type Hours = { open?: string; close?: string } | null | undefined;

/**
 * Opening hours of a salon, whatever the stored format: the current
 * schedules[] list, or the older day keyed object (French or English keys).
 * label null = closed.
 */
export function openingHours(businessHours: Record<string, unknown> | null | undefined): DayHours[] {
  if (!businessHours) return [];
  const schedules = businessHours.schedules;
  if (Array.isArray(schedules) && schedules.length > 0) {
    return DAYS.map((day) => {
      const s = schedules.find((x) => String((x as { day?: string })?.day ?? '').toLowerCase() === day.toLowerCase()) as
        | { isOpen?: boolean; openTime?: string; closeTime?: string; breaks?: { start: string; end: string }[] }
        | undefined;
      if (!s || s.isOpen === false || !s.openTime || !s.closeTime) return { day, label: null };
      const breaks = (s.breaks ?? []).filter((b) => b.start && b.end);
      if (breaks.length === 0) return { day, label: `${s.openTime} à ${s.closeTime}` };
      const parts: string[] = [];
      let from = s.openTime;
      for (const b of breaks) {
        parts.push(`${from} à ${b.start}`);
        from = b.end;
      }
      parts.push(`${from} à ${s.closeTime}`);
      return { day, label: parts.join(', ') };
    });
  }
  const hasLegacy = DAYS.some((d) => LEGACY_KEYS[d]!.some((k) => k in businessHours));
  if (!hasLegacy) return [];
  return DAYS.map((day) => {
    const key = LEGACY_KEYS[day]!.find((k) => k in businessHours);
    const h = (key ? businessHours[key] : null) as Hours;
    return { day, label: h?.open && h?.close ? `${h.open} à ${h.close}` : null };
  });
}

/** Price as shown to a client (fixed, from, range or on quote). */
export function servicePrice(s: Pick<SalonService, 'price' | 'priceType' | 'priceFrom' | 'priceTo' | 'onQuote'>): string {
  if (s.onQuote) return 'Sur devis';
  if (s.priceType === 'RANGE' && s.priceFrom != null && s.priceTo != null) return `${formatMoney(s.priceFrom)} à ${formatMoney(s.priceTo)}`;
  if (s.priceType === 'FROM') return `Dès ${formatMoney(s.priceFrom ?? s.price ?? 0)}`;
  return formatMoney(s.price ?? 0);
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m}`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Services grouped by category, in the salon's order. */
export function groupServices(services: SalonService[]): [string, SalonService[]][] {
  const groups = new Map<string, SalonService[]>();
  for (const s of services) {
    if (s.visibility === 'HIDDEN') continue;
    const key = s.category?.trim() || 'Prestations';
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()];
}

const isActive = (a: ClientAppointment) => a.status === 'pending' || a.status === 'confirmed';

/** Splits the list as in the app: coming, done, cancelled. */
export function splitAppointments(list: ClientAppointment[], now = Date.now()) {
  const upcoming = list.filter((a) => isActive(a) && new Date(a.startTime).getTime() >= now).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const cancelled = list.filter((a) => a.status === 'cancelled').sort((a, b) => b.startTime.localeCompare(a.startTime));
  const past = list.filter((a) => !upcoming.includes(a) && !cancelled.includes(a)).sort((a, b) => b.startTime.localeCompare(a.startTime));
  return { upcoming, past, cancelled };
}

export type SalonSort = 'pertinence' | 'note' | 'prix-asc' | 'prix-desc';

export const SALON_SORTS: { value: SalonSort; label: string }[] = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'note', label: 'Mieux notés' },
  { value: 'prix-asc', label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
];

/** Discovery list after the client side filters (sort, online booking only). */
export function arrangeSalons(list: SalonCard[], sort: SalonSort, onlineOnly: boolean): SalonCard[] {
  const kept = onlineOnly ? list.filter((s) => s.onlineReservationEnabled !== false) : [...list];
  const price = (s: SalonCard) => s.priceRange?.min ?? null;
  if (sort === 'note') kept.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0));
  if (sort === 'prix-asc' || sort === 'prix-desc') {
    const dir = sort === 'prix-asc' ? 1 : -1;
    // Salons without a price stay at the end either way.
    kept.sort((a, b) => {
      const pa = price(a);
      const pb = price(b);
      if (pa === null) return pb === null ? 0 : 1;
      if (pb === null) return -1;
      return (pa - pb) * dir;
    });
  }
  return kept;
}
