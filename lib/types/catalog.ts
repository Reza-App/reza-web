import type { PersonRef } from './api';

export interface WorkingBreak {
  start: string;
  end: string;
}

export interface WorkingDay {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: WorkingBreak[];
}

export interface AgendaSettings {
  role?: string;
  color?: string;
  status?: string;
  bufferTime?: number;
  timeSlotDuration?: number;
  allowOnlineBooking?: boolean;
  maxAppointmentsPerDay?: number;
}

export interface Employee extends PersonRef {
  tenantId: string;
  /** User account appointments reference for this employee (may differ from id). */
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  isActive: boolean;
  isPublic?: boolean;
  workingHours?: WorkingDay[] | null;
  agendaSettings?: AgendaSettings | null;
  createdAt?: string;
}

export type PriceType = 'FIXED' | 'FROM' | 'RANGE' | (string & {});
export type ServiceVisibility = 'BOOKABLE' | 'HIDDEN' | (string & {});

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  abbreviation?: string | null;
  description?: string | null;
  category?: string | null;
  color?: string | null;
  price: number;
  priceType?: PriceType;
  priceFrom?: number | null;
  priceTo?: number | null;
  onQuote?: boolean;
  duration: number;
  visibility?: ServiceVisibility;
  multipleProviders?: boolean;
  competences?: string[];
  employeeServices?: { employeeId: string; employee?: PersonRef }[];
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | (string & {});

export interface Client extends PersonRef {
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  status?: ClientStatus;
  createdAt?: string;
  _count?: { appointments?: number };
}
