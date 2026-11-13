import { api } from '../client';

const R = 'backend/stats';

/** Either a named period or an explicit date range (YYYY-MM-DD). */
export interface PeriodQuery {
  period?: 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}

type Delta = number | null;

export interface DashboardStats {
  onlineAppointments: number;
  totalAppointments: number;
  onlineRate: number;
  newOnlineClients: number;
  newSalonClients: number;
  appointmentsTrend: { day: string; salon: number; online: number }[];
  revenueData: { name: string; value: number }[];
  totalRevenue: number;
  avgRevenue: number;
  peakDay: string;
  serviceData: { name: string; value: number }[];
  employeeData: { name: string; avatar?: string | null; appointments: number; revenue: number; rating: number }[];
  timeSlotData: { slot: string; count: number }[];
  attendanceRate: number;
  avgDuration: number;
  avgSatisfaction: number;
  loyaltyRate: number;
  cancellationRate: number;
  advanceBookingRate: number;
  avgBasket: number;
  loyalClientsCount: number;
  peakHours: { time: string; rate: number }[];
  bookingChannels: { channel: string; count: number; percentage: number }[];
  ageDistribution: { age: string; count: number; percentage: number }[];
  visitFrequency: { type: string; desc: string; count: number }[];
  timePreferences: { day: string; morning: number; afternoon: number; evening: number }[];
  deltas: Record<string, Delta>;
}

interface NamedValue {
  name: string;
  value: number;
}

export interface OtherStats {
  totalRDV: number;
  activeCollaborateurs: number;
  totalServices: number;
  avgDuration: number;
  rdvPrisData: NamedValue[];
  prestationsSalonData: NamedValue[];
  prestationsLigneData: NamedValue[];
  totalPrestationsData: NamedValue[];
  rdvSalonParPrestationData: NamedValue[];
  rdvLigneParPrestationData: NamedValue[];
  totalRdvParPrestationData: NamedValue[];
  performanceData: { name: string; avatar?: string | null; rdv: number; prestations: number; taux: number }[];
}

export interface ServiceStats {
  totalPrestations: number;
  prisEnSalon: number;
  prisEnLigne: number;
  tauxEnLigne: number;
  prestationsData: {
    category: string;
    items: { name: string; total: number; salon: number; ligne: number; taux: number; revenue: number }[];
  }[];
}

export interface CollaboratorStats {
  collaborators: {
    id: string;
    name: string;
    avatar?: string | null;
    totalServices: number;
    inSalon: number;
    online: number;
    onlineRate: number;
    revenue: number;
  }[];
  totals: { totalServices: number; inSalon: number; online: number; revenue: number; onlineRate: number };
}

export interface DailyRdvStats {
  dailyData: {
    date: string;
    totalPrestations: number;
    inSalon: number;
    online: number;
    onlineRate: string;
    absents: number;
    tauxAbsence: string;
    annules: number;
    tauxAnnulation: string;
  }[];
  totals: {
    totalPrestations: number;
    inSalon: number;
    online: number;
    absents: number;
    annules: number;
    totalOnlineRate: string;
    totalTauxAbsence: string;
    totalTauxAnnulation: string;
  };
  deltas: Record<string, Delta>;
}

export interface OccupancyOverview {
  /** day (LUN..DIM) to hour slot ("09:00 - 10:00") to percentage. */
  occupancyData: Record<string, Record<string, number>>;
  stats: { average: number; peak: number; peakDay: string; peakTime: string };
}

export interface OccupancyCollaborators {
  collaborators: {
    id: string;
    name: string;
    avatar?: string | null;
    occupationRate: number;
    workedHours: number;
    revenue: number;
    appointmentCount: number;
  }[];
  totals: { occupationRate: number; workedHours: number; revenue: number; appointmentCount: number };
}

export interface OccupancyServices {
  servicesData: {
    category: string;
    services: { name: string; occupancyRate: number; hoursWorked: string; totalRevenue: number; appointmentCount: number }[];
  }[];
  stats: { totalRevenue: number; totalHours: number; avgOccupancy: number; totalAppointmentCount: number };
}

export interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status?: string;
}

export interface TopClients {
  clients: (ClientRow & { visits: number; revenue: number; lastVisit?: string | null })[];
  total: number;
}

export interface NewClients {
  clients: (ClientRow & { createdAt: string; appointmentCount: number; invoiceCount: number })[];
  total: number;
  trend: { month: string; count: number }[];
}

export interface ClientFrequency {
  frequencyBuckets: { type: string; desc: string; count: number; clients: (ClientRow & { visits: number })[] }[];
}

const get = <T>(path: string, query: PeriodQuery & { limit?: number }, signal?: AbortSignal) =>
  api.get<T>(`${R}/${path}`, { query: { ...query }, signal });

export const statsService = {
  dashboard: (q: PeriodQuery, s?: AbortSignal) => get<DashboardStats>('dashboard', q, s),
  others: (q: PeriodQuery, s?: AbortSignal) => get<OtherStats>('autres', q, s),
  services: (q: PeriodQuery, s?: AbortSignal) => get<ServiceStats>('prestations', q, s),
  collaborators: (q: PeriodQuery, s?: AbortSignal) => get<CollaboratorStats>('collaborateurs', q, s),
  daily: (q: PeriodQuery, s?: AbortSignal) => get<DailyRdvStats>('rdv', q, s),
  occupancyOverview: (q: PeriodQuery, s?: AbortSignal) => get<OccupancyOverview>('occupation/vue-ensemble', q, s),
  occupancyCollaborators: (q: PeriodQuery, s?: AbortSignal) => get<OccupancyCollaborators>('occupation/collaborateurs', q, s),
  occupancyServices: (q: PeriodQuery, s?: AbortSignal) => get<OccupancyServices>('occupation/prestations', q, s),
  topClients: (q: PeriodQuery & { limit?: number }, s?: AbortSignal) => get<TopClients>('clients/top', q, s),
  newClients: (q: PeriodQuery, s?: AbortSignal) => get<NewClients>('clients/new', q, s),
  frequency: (q: PeriodQuery, s?: AbortSignal) => get<ClientFrequency>('clients/frequency', q, s),
};
