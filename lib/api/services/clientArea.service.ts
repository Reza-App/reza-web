import { api } from '../client';

/**
 * Client area (app users): discovery, salon pages, booking and account. All
 * calls go through /api/client/* (client session cookie, allowlisted routes).
 */

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  dateOfBirth?: string | null;
  memberSince?: string | null;
}

export interface SalonCard {
  id: string;
  slug?: string | null;
  name: string;
  category?: string | null;
  city?: string | null;
  address?: string | null;
  coverImage?: string | null;
  images?: string[];
  shortDescription?: string | null;
  rating?: number | null;
  reviews?: number | null;
  price?: string | null;
  nextAvailable?: string | null;
  priceRange?: { min: number; max: number; avg: number } | null;
  onlineReservationEnabled?: boolean;
}

export interface SalonDetail extends SalonCard {
  phone?: string | null;
  website?: string | null;
  googleMapsLink?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  settings?: {
    description?: string | null;
    businessHours?: Record<string, unknown> | null;
    photos?: string[];
    socialMedia?: Record<string, string>;
    amenities?: string[];
    onlineReservationEnabled?: boolean;
    showMap?: boolean;
    showOpeningHours?: boolean;
    showReviews?: boolean;
    bookingAdvanceDays?: number;
  } | null;
}

export interface PersonLite {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

export interface SalonService {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  priceType?: 'FIXED' | 'FROM' | 'RANGE' | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  onQuote?: boolean;
  duration: number;
  visibility?: string;
  employees?: PersonLite[];
}

export interface SalonEmployee extends PersonLite {
  role?: string | null;
  services?: { id: string; name: string }[];
}

export interface SalonReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  client?: { firstName: string; lastName: string; avatar?: string | null } | null;
}

export interface ClientAppointment {
  id: string;
  salon: string;
  salonId: string;
  service: string;
  services: { id: string; serviceId: string; name: string; duration: number; price: number }[];
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | string;
  price: number;
  duration: string;
  professional?: string | null;
  image?: string | null;
  address?: string | null;
  startTime: string;
  bookedFor?: string | null;
  /** False when the client booked it for someone else. */
  isMine?: boolean;
  bookingGroupId?: string | null;
}

export interface Favorite {
  id: string;
  tenantId: string;
  tenant: SalonCard;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship: string;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
}

export interface ClientReview {
  id: string;
  /** Appointment the review is about (one review per appointment). */
  appointmentId?: string | null;
  tenantId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  salon: string;
  salonImage?: string | null;
  service?: string | null;
  rating: number;
  comment?: string | null;
  date: string;
}

export interface ClientNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const A = 'client/api';
const me = `${A}/client/me`;

export const clientSession = {
  me: () => api.get<{ client: ClientProfile }>('client/session').then((r) => r.client),
  login: (email: string, password: string) => api.post<{ client: ClientProfile }>('client/session', { email, password }),
  logout: () => api.delete<void>('client/session'),
  register: (input: { email: string; password: string; firstName: string; lastName: string; phone: string; gender?: string; dateOfBirth?: string }) =>
    api.post<{ message?: string }>('client/auth/register', input),
  resendVerification: (email: string) => api.post<{ message?: string }>('client/auth/resend-verification', { email }),
  verifyEmail: (token: string) => api.post<{ message?: string }>('client/auth/verify', { token }),
  forgotCode: (email: string) => api.post<{ message?: string }>('client/auth/forgot-code', { email }),
  resetPassword: (email: string, code: string, password: string) => api.post<{ message?: string }>('client/auth/reset', { email, token: code, password }),
};

export const discovery = {
  salons: (params: { search?: string; city?: string; categories?: string; limit?: number }, signal?: AbortSignal) =>
    api.get<{ tenants: SalonCard[] }>(`${A}/tenants`, { query: { limit: 60, ...params }, signal }).then((r) => r.tenants ?? []),
  categories: (signal?: AbortSignal) =>
    api.get<{ categories: { name: string; count: number }[] }>(`${A}/categories`, { signal }).then((r) => r.categories ?? []),
  salon: (id: string, signal?: AbortSignal) => api.get<{ tenant: SalonDetail }>(`${A}/tenant/${encodeURIComponent(id)}`, { signal }).then((r) => r.tenant),
  services: (id: string, signal?: AbortSignal) =>
    api.get<{ services: SalonService[] }>(`${A}/tenant/${encodeURIComponent(id)}/services`, { signal }).then((r) => r.services ?? []),
  employees: (id: string, signal?: AbortSignal) =>
    api.get<{ employees: SalonEmployee[] }>(`${A}/tenant/${encodeURIComponent(id)}/employees`, { signal }).then((r) => r.employees ?? []),
  reviews: (id: string, signal?: AbortSignal) =>
    api
      .get<{ reviews: SalonReview[]; stats?: { averageRating: number; totalReviews: number } }>(`${A}/tenant/${encodeURIComponent(id)}/reviews`, {
        query: { page: 1, limit: 50 },
        signal,
      }),
  /**
   * Free start times ("HH:MM", salon clock) for these services and professionals.
   * `clientEmail`: set when the client is part of the booking, so their own
   * appointments are excluded (same check as at confirmation).
   */
  slots: (
    id: string,
    date: string,
    body: {
      serviceIds: string[];
      serviceEmployees: { serviceId: string; employeeId: string | null }[];
      clientEmail?: string;
      /** Group: every person at the same start time. */
      participants?: { serviceIds: string[]; serviceEmployees: { serviceId: string; employeeId: string | null }[] }[];
    },
  ) =>
    api
      .post<{ slots: string[] }>(
        `${A}/tenant/${encodeURIComponent(id)}/available-slots`,
        { ...body, date, serviceIds: body.serviceIds.join(',') },
        { query: { date, serviceIds: body.serviceIds.join(',') } },
      )
      .then((r) => r.slots ?? []),
};

export interface BookingInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  serviceIds: string[];
  startTime: string;
  serviceEmployees?: { serviceId: string; employeeId: string | null }[];
  notes?: string;
  includeBooker?: boolean;
  participants?: {
    name: string;
    phone?: string;
    email?: string;
    serviceIds: string[];
    serviceEmployees?: { serviceId: string; employeeId: string | null }[];
    startTime: string;
  }[];
}

export const clientAccount = {
  book: (input: BookingInput) => api.post<Record<string, unknown>>(`${A}/bookings`, input),
  appointments: (signal?: AbortSignal) =>
    api.get<{ appointments: ClientAppointment[] }>(`${me}/appointments`, { signal }).then((r) => r.appointments ?? []),
  cancel: (id: string, email: string) => api.put<unknown>(`${A}/appointments/${encodeURIComponent(id)}/cancel`, { email }),
  favorites: (signal?: AbortSignal) => api.get<{ favorites: Favorite[] }>(`${me}/favorites`, { signal }).then((r) => r.favorites ?? []),
  addFavorite: (tenantId: string, clientEmail: string) => api.post<{ favorite?: Favorite }>(`${A}/favorites`, { tenantId, clientEmail }),
  removeFavorite: (favoriteId: string) => api.delete<void>(`${A}/favorites/${encodeURIComponent(favoriteId)}`),
  family: (signal?: AbortSignal) => api.get<{ familyMembers: FamilyMember[] }>(`${me}/family-members`, { signal }).then((r) => r.familyMembers ?? []),
  addFamily: (input: Omit<FamilyMember, 'id'> & { clientEmail: string }) => api.post<{ familyMember?: FamilyMember }>(`${A}/family-members`, input),
  updateFamily: (id: string, input: Partial<Omit<FamilyMember, 'id'>> & { clientEmail: string }) =>
    api.put<unknown>(`${A}/family-members/${encodeURIComponent(id)}`, input),
  removeFamily: (id: string) => api.delete<void>(`${A}/family-members/${encodeURIComponent(id)}`),
  reviews: (signal?: AbortSignal) => api.get<{ reviews: ClientReview[] }>(`${me}/reviews`, { signal }).then((r) => r.reviews ?? []),
  addReview: (input: { tenantId: string; appointmentId?: string; firstName: string; lastName: string; email: string; rating: number; comment?: string }) =>
    api.post<unknown>(`${A}/reviews`, input),
  updateReview: (id: string, input: { email: string; rating: number; comment?: string }) => api.put<unknown>(`${A}/reviews/${encodeURIComponent(id)}`, input),
  removeReview: (id: string, email: string) => api.delete<void>(`${A}/reviews/${encodeURIComponent(id)}`, { query: { email } }),
  notifications: (signal?: AbortSignal) =>
    api.get<{ notifications: ClientNotification[]; unreadCount: number }>(`${me}/notifications`, { query: { limit: 30 }, signal }),
  markNotificationRead: (id: string) => api.patch<unknown>(`${A}/notifications/${encodeURIComponent(id)}/read`),
  updateProfile: (input: Partial<Pick<ClientProfile, 'firstName' | 'lastName' | 'phone' | 'gender' | 'dateOfBirth' | 'avatar'>>) =>
    api.put<{ client?: ClientProfile }>(me, input),
  /** Step 1: checks the current password and emails a 6 digit code. */
  sendPasswordCode: (currentPassword: string) => api.post<{ message?: string }>(`${me}/send-password-code`, { currentPassword }),
  changePassword: (input: { code: string; newPassword: string }) => api.put<{ message?: string }>(`${me}/change-password`, input),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<{ avatar: string }>(`${A}/auth/upload-avatar`, form, { timeoutMs: 60_000 }).then((r) => r.avatar);
  },
};

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};
