import { api } from '../client';
import type { AppointmentDisplaySettings, BusinessHours, Tenant, TenantSettings } from '@/lib/types/tenant';

const R = 'backend/tenant';

export const tenantService = {
  get: (signal?: AbortSignal) => api.get<{ tenant: Tenant }>(R, { signal }).then((r) => r.tenant),
  update: (input: Partial<Tenant>) => api.put<{ tenant: Tenant }>(R, input).then((r) => r.tenant),

  settings: (signal?: AbortSignal) =>
    api.get<{ settings: TenantSettings }>(`${R}/settings`, { signal }).then((r) => r.settings),
  updateSettings: (input: Partial<TenantSettings>) =>
    api.put<{ settings: TenantSettings }>(`${R}/settings`, input).then((r) => r.settings),

  businessHours: (signal?: AbortSignal) => api.get<BusinessHours>(`${R}/settings/business-hours`, { signal }),
  updateBusinessHours: (input: BusinessHours) => api.put<BusinessHours>(`${R}/settings/business-hours`, input),

  displaySettings: (signal?: AbortSignal) =>
    api
      .get<{ settings: AppointmentDisplaySettings }>(`${R}/settings/appointment-display`, { signal })
      .then((r) => r.settings),
  updateDisplaySettings: (settings: AppointmentDisplaySettings) =>
    api.put<{ settings: AppointmentDisplaySettings }>(`${R}/settings/appointment-display`, settings),

  notificationEmails: (signal?: AbortSignal) =>
    api.get<{ emails: string[] }>(`${R}/notifications/appointment-emails`, { signal }).then((r) => r.emails),
  updateNotificationEmails: (emails: string[]) =>
    api.put<{ emails: string[] }>(`${R}/notifications/appointment-emails`, { emails }),

  autoConfirm: (signal?: AbortSignal) =>
    api.get<{ enabled: boolean }>(`${R}/settings/auto-confirm`, { signal }).then((r) => r.enabled),
  setAutoConfirm: (enabled: boolean) => api.put<{ enabled: boolean }>(`${R}/settings/auto-confirm`, { enabled }),

  /** Uploads an image to the media storage and returns its public URL. */
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('coverImage', file);
    return api.post<{ coverImage: string }>(`${R}/upload-cover-image`, form, { timeoutMs: 60_000 }).then((r) => r.coverImage);
  },
};
