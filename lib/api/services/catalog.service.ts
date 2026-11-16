import { api } from '../client';
import type { Pagination } from '@/lib/types/api';
import type { AgendaSettings, Client, ClientStatus, Employee, Service, WorkingDay } from '@/lib/types/catalog';

const R = 'backend';

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender?: 'male' | 'female';
  avatar?: string | null;
  isActive?: boolean;
  workingHours?: WorkingDay[];
  agendaSettings?: AgendaSettings;
  serviceIds?: string[];
}

export interface ServiceInput {
  name: string;
  abbreviation?: string;
  description?: string;
  category?: string;
  color?: string;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  priceFrom?: number;
  priceTo?: number;
  onQuote?: boolean;
  duration: number;
  visibility?: 'BOOKABLE' | 'VISIBLE' | 'HIDDEN';
  multipleProviders?: boolean;
  competences?: string[];
  employeeIds?: string[];
}

export interface ClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export interface ClientQuery {
  search?: string;
  status?: ClientStatus | 'all';
  page?: number;
  limit?: number;
}

/** A client and the other records that look like the same person. */
export type DuplicateGroup = Client & { duplicates: (Client & { reason: string })[] };

export const employeeService = {
  list: (params: { active?: boolean; search?: string } = {}, signal?: AbortSignal) =>
    api
      .get<{ employees: Employee[] }>(`${R}/employees`, {
        query: { active: params.active === undefined ? undefined : String(params.active), search: params.search },
        signal,
      })
      .then((r) => r.employees),
  create: (input: EmployeeInput) => api.post<{ employee: Employee }>(`${R}/employees`, input).then((r) => r.employee),
  update: (id: string, input: Partial<EmployeeInput>) =>
    api.put<{ employee: Employee }>(`${R}/employees/${encodeURIComponent(id)}`, input).then((r) => r.employee),
  remove: (id: string) => api.delete<void>(`${R}/employees/${encodeURIComponent(id)}`),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<{ avatar: string }>(`${R}/employees/upload-avatar`, form).then((r) => r.avatar);
  },
};

export const serviceCatalog = {
  list: (params: { category?: string; search?: string } = {}, signal?: AbortSignal) =>
    api.get<{ services: Service[]; categories: string[] }>(`${R}/services`, { query: params, signal }),
  create: (input: ServiceInput) => api.post<{ service: Service }>(`${R}/services`, input).then((r) => r.service),
  update: (id: string, input: Partial<ServiceInput>) =>
    api.put<{ service: Service }>(`${R}/services/${encodeURIComponent(id)}`, input).then((r) => r.service),
  remove: (id: string) => api.delete<void>(`${R}/services/${encodeURIComponent(id)}`),
  setCategories: (categories: string[]) =>
    api.put<{ categories: string[] }>(`${R}/services/categories`, { categories }),
  /** Saves category and position of services moved by drag and drop. */
  reorder: (items: { id: string; category: string | null; sortOrder: number }[]) =>
    api.put<{ updated: number }>(`${R}/services/order`, { items }),
};

export const clientService = {
  list: (query: ClientQuery = {}, signal?: AbortSignal) =>
    api.get<{ clients: Client[]; pagination: Pagination }>(`${R}/clients`, {
      query: { ...query, status: query.status === 'all' ? undefined : query.status },
      signal,
    }),
  get: (id: string, signal?: AbortSignal) =>
    api.get<{ client: Client }>(`${R}/clients/${encodeURIComponent(id)}`, { signal }).then((r) => r.client),
  create: (input: ClientInput) => api.post<{ client: Client }>(`${R}/clients`, input).then((r) => r.client),
  update: (id: string, input: Partial<ClientInput>) =>
    api.put<{ client: Client }>(`${R}/clients/${encodeURIComponent(id)}`, input).then((r) => r.client),
  remove: (id: string) => api.delete<void>(`${R}/clients/${encodeURIComponent(id)}`),
  duplicates: (signal?: AbortSignal) => api.get<{ duplicates: DuplicateGroup[] }>(`${R}/clients/duplicates`, { signal }),
  /** Keeps `primaryClientId` and moves the history of the duplicates onto it. */
  merge: (primaryClientId: string, duplicateClientIds: string[]) =>
    api.post<{ mergedClientId: string }>(`${R}/clients/merge`, { primaryClientId, duplicateClientIds }),
};
