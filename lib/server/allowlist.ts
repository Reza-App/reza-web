/**
 * Authenticated backend resources the dashboard may reach through the BFF.
 * Anything else (login, superadmin, public client routes...) is refused.
 */
const ALLOWED_ROOTS = new Set([
  'appointments',
  'cash-transactions',
  'clients',
  'dashboard',
  'employees',
  'family-members',
  'invoices',
  'notifications',
  'reviews',
  'salons',
  'services',
  'stats',
  'subscription',
  'superadmin',
  'tenant',
]);

const ALLOWED_AUTH = new Set(['me', 'profile', 'upload-avatar', 'send-password-code', 'change-password', 'socket-ticket']);

const SEGMENT_RE = /^[A-Za-z0-9._~@%-]+$/;

export function isAllowedPath(segments: string[]): boolean {
  if (segments.length === 0) return false;
  if (segments.some((s) => !SEGMENT_RE.test(s) || s === '.' || s === '..')) return false;
  const [root, second] = segments;
  if (root === 'auth') return segments.length === 2 && ALLOWED_AUTH.has(second);
  return ALLOWED_ROOTS.has(root);
}
