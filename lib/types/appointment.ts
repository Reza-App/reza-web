import type { PersonRef } from './api';

export const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absent',
};

export interface AppointmentServiceItem {
  id: string;
  serviceId: string;
  name: string;
  duration: number;
  price: number;
  employee?: PersonRef | null;
}

export interface Appointment {
  id: string;
  tenantId: string;
  clientId: string;
  client?: (PersonRef & { email?: string | null; phone?: string | null }) | null;
  employee?: PersonRef | null;
  startTime: string;
  endTime: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  services: AppointmentServiceItem[];
  totalDuration?: number;
  totalPrice?: number;
  takenOnline?: boolean;
  createdAt?: string;
}

export interface AppointmentServiceInput {
  serviceId: string;
  employeeId?: string;
}

export interface CreateAppointmentInput {
  clientId: string;
  services: AppointmentServiceInput[];
  employeeId?: string;
  startTime: string;
  duration?: number;
  notes?: string;
  status?: AppointmentStatus;
  source?: 'ADMIN';
}

export interface PlanEmployee {
  employeeId: string;
  employeeName: string;
  available: boolean;
  recommended: boolean;
}

export interface PlanResult {
  estimatedEndTime?: string;
  recommendedAssignment: { serviceId: string; employeeId: string | null; employeeName?: string }[];
  services: { serviceId: string; serviceName: string; duration: number; employees: PlanEmployee[] }[];
  alerts: { severity?: 'conflict' | 'warning' | (string & {}); type?: string; message: string }[];
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as AppointmentStatus] ?? status;
}

/** Service names of an appointment, joined for display. */
export function serviceSummary(appointment: Pick<Appointment, 'services'>): string {
  return appointment.services.map((s) => s.name).join(', ');
}
