import { api } from '../client';

export interface FieldRule {
  display: boolean;
  required: boolean;
}

export type ModerationRuleType = 'keyword' | 'rating' | 'length' | 'auto-approve';
export type ModerationAction = 'auto-reject' | 'flag' | 'auto-approve';

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: ModerationRuleType;
  keywords: string[];
  rating?: number;
  length?: number;
  action: ModerationAction;
  isActive: boolean;
}

export interface TenantPreferences {
  bookingMessage: { enabled: boolean; text: string };
  waitingList: { enabled: boolean };
  clientFile: {
    gender: FieldRule;
    birthDate: FieldRule & { yearOnly: boolean };
    address: FieldRule & { postalCodeOnly: boolean };
  };
  moderationRules: ModerationRule[];
}

const R = 'backend/tenant/settings/preferences';

/** Whole document read and written at once (the backend validates it). */
export const preferencesService = {
  get: (signal?: AbortSignal) => api.get<{ preferences: TenantPreferences }>(R, { signal }).then((r) => r.preferences),
  save: (preferences: TenantPreferences) =>
    api.put<{ preferences: TenantPreferences }>(R, preferences).then((r) => r.preferences),
};
