export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string }[];
}

export interface DelaySetting {
  value: string;
  unit: string;
  allowLastMoment?: boolean;
}

export interface BusinessHours {
  onlineBooking?: string;
  schedules: DaySchedule[];
  exceptionalSchedules?: { date: string; isOpen?: boolean; openTime?: string; closeTime?: string; label?: string }[];
  agendaStart?: string;
  agendaEnd?: string;
  bookingDelay?: DelaySetting;
  cancellationDelay?: DelaySetting;
  advanceBooking?: DelaySetting;
  blockedDates?: string[];
}

export interface DisplayField {
  id: 'hours' | 'clientName' | 'services' | 'notes' | (string & {});
  label: string;
  visible: boolean;
  order: number;
}

export interface AppointmentDisplaySettings {
  showColorInRDV: boolean;
  fields: DisplayField[];
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  description?: string | null;
  photos?: string[] | null;
  coverImages?: string[] | null;
  timezone?: string;
  currency?: string;
  amenities?: string[] | null;
  /** Payment methods accepted at the salon: CASH, CARD, TRANSFER, CHECK. */
  acceptedPayments?: string[] | null;
  badges?: string[] | null;
  socialMedia?: Record<string, string> | null;
  showMap?: boolean;
  showOpeningHours?: boolean;
  showOnlineReservation?: boolean;
  showReviews?: boolean;
  onlineReservationEnabled?: boolean;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  category?: string | null;
  categories?: string[] | null;
  shortDescription?: string | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  headerImage?: string | null;
  googleMapsLink?: string | null;
  website?: string | null;
  [key: string]: unknown;
}

/** Display order of days in the backend schedules (Monday first). */
export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

/** Schedule of a JS date (getDay: 0 = Sunday). */
export function scheduleFor(hours: BusinessHours | undefined, date: Date): DaySchedule | undefined {
  const name = DAY_NAMES[(date.getDay() + 6) % 7];
  return hours?.schedules.find((s) => s.day === name);
}
