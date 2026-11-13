/** Header the BFF requires on every call: a cross site form can not set it. */
export const CSRF_HEADER = 'x-selia-request';

/** Root of the app's own API routes (session + backend proxy). */
export const BFF_BASE = '/api';
