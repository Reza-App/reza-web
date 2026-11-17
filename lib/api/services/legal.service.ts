import { api } from '../client';

export interface LegalIdentity {
  companyName: string | null;
  companyAddress: string | null;
  companyIce: string | null;
  companyRc: string | null;
  companyIf: string | null;
}

/** Legal identity of Selia (legal notice page), public read through the BFF. */
export const legalService = {
  identity: (signal?: AbortSignal) => api.get<LegalIdentity>('client/api/legal', { signal }),
};
