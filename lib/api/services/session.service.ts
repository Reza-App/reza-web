import { api } from '../client';
import type { Session } from '@/lib/types/session';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  salonName: string;
}

export const sessionService = {
  current: (signal?: AbortSignal) => api.get<Session>('session', { signal }),
  login: (email: string, password: string, remember = false) => api.post<Session>('session', { email, password, remember }),
  logout: () => api.delete<void>('session'),
  switchSalon: (tenantId: string) => api.post<Session>('session/salon', { tenantId }),

  register: (input: RegisterInput) =>
    api.post<{ message?: string }>('auth/register', {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      password: input.password,
      createTenant: true,
      tenantName: input.salonName,
      tenantEmail: input.email,
      tenantPhone: input.phone,
    }),
  forgotPassword: (email: string) => api.post<{ message?: string }>('auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message?: string }>('auth/reset-password', { token, password }),
  verifyEmail: (token: string, email: string) =>
    api.post<{ message?: string }>('auth/verify-email', { token, email }),
  resendVerification: (email: string) =>
    api.post<{ message?: string }>('auth/resend-verification', { email }),
};
