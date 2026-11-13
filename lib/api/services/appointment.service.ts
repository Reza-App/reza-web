import { api } from '../client';
import type { Pagination } from '@/lib/types/api';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  PlanResult,
} from '@/lib/types/appointment';

const R = 'backend/appointments';

export interface AppointmentQuery {
  /** YYYY-MM-DD, inclusive. */
  startDate?: string;
  /** YYYY-MM-DD, inclusive. */
  endDate?: string;
  cancelledStartDate?: string;
  cancelledEndDate?: string;
  clientId?: string;
  employeeId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  page?: number;
  limit?: number;
}

export interface PlanInput {
  serviceIds: string[];
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  startTime: string;
  clientId?: string;
  assignments?: { serviceId: string; employeeId: string | null }[];
}

export const appointmentService = {
  list: (query: AppointmentQuery, signal?: AbortSignal) =>
    api.get<{ appointments: Appointment[]; pagination: Pagination }>(R, { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) =>
    api.get<{ appointment: Appointment }>(`${R}/${encodeURIComponent(id)}`, { signal }).then((r) => r.appointment),

  create: (input: CreateAppointmentInput) =>
    api.post<{ appointment: Appointment }>(R, { source: 'ADMIN', ...input }).then((r) => r.appointment),

  update: (id: string, input: Partial<CreateAppointmentInput>) =>
    api.put<{ appointment: Appointment }>(`${R}/${encodeURIComponent(id)}`, input).then((r) => r.appointment),

  setStatus: (id: string, status: AppointmentStatus) => appointmentService.update(id, { status }),

  /** Moves an appointment; the backend rejects the slot if it is not feasible. */
  move: (id: string, startTime: Date) =>
    appointmentService.update(id, { startTime: startTime.toISOString() }),

  /** Soft cancel (the backend keeps it in the "RDV annulés" bin). */
  cancel: (id: string) => api.delete<{ message: string }>(`${R}/${encodeURIComponent(id)}`),

  plan: (input: PlanInput, signal?: AbortSignal) => api.post<PlanResult>(`${R}/plan`, input, { signal }),
};
