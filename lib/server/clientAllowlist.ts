/**
 * Backend routes the client area may reach through the BFF (all under
 * /api/public). Anything else is refused. In /client/me/... the "me" segment
 * is replaced with the signed in client's email, so the browser never picks
 * whose data it reads (the API checks it again against the token).
 */
const SEGMENT_RE = /^[A-Za-z0-9._~@%-]+$/;

type Rule = { methods: string[]; match: (s: string[]) => boolean };

const RULES: Rule[] = [
  // Discovery (public reads)
  { methods: ['GET'], match: (s) => s[0] === 'tenants' && s.length === 1 },
  { methods: ['GET'], match: (s) => s[0] === 'categories' && s.length === 1 },
  { methods: ['GET'], match: (s) => s[0] === 'tenant' && (s.length === 2 || (s.length === 3 && ['services', 'employees', 'reviews', 'available-days'].includes(s[2]!))) },
  { methods: ['GET', 'POST'], match: (s) => s[0] === 'tenant' && s.length === 3 && s[2] === 'available-slots' },
  // Booking and account
  { methods: ['POST'], match: (s) => s[0] === 'bookings' && s.length === 1 },
  { methods: ['PUT'], match: (s) => s[0] === 'appointments' && s.length === 3 && s[2] === 'cancel' },
  { methods: ['POST'], match: (s) => s[0] === 'reviews' && s.length === 1 },
  { methods: ['PUT', 'DELETE'], match: (s) => s[0] === 'reviews' && s.length === 2 },
  { methods: ['PATCH'], match: (s) => s[0] === 'notifications' && s.length === 3 && s[2] === 'read' },
  { methods: ['POST'], match: (s) => s[0] === 'family-members' && s.length === 1 },
  { methods: ['PUT', 'DELETE'], match: (s) => s[0] === 'family-members' && s.length === 2 },
  { methods: ['POST'], match: (s) => s[0] === 'favorites' && s.length === 1 },
  { methods: ['DELETE'], match: (s) => s[0] === 'favorites' && s.length === 2 },
  { methods: ['POST'], match: (s) => s[0] === 'auth' && s[1] === 'upload-avatar' && s.length === 2 },
  { methods: ['GET', 'PUT'], match: (s) => s[0] === 'client' && s[1] === 'me' && s.length === 2 },
  {
    methods: ['GET'],
    match: (s) => s[0] === 'client' && s[1] === 'me' && s.length === 3 && ['appointments', 'reviews', 'notifications', 'family-members', 'favorites'].includes(s[2]!),
  },
  { methods: ['POST'], match: (s) => s[0] === 'client' && s[1] === 'me' && s.length === 3 && s[2] === 'send-password-code' },
  { methods: ['PUT'], match: (s) => s[0] === 'client' && s[1] === 'me' && s.length === 3 && s[2] === 'change-password' },
];

export function isAllowedClientPath(segments: string[], method: string): boolean {
  if (segments.length === 0) return false;
  if (segments.some((s) => !SEGMENT_RE.test(s) || s === '.' || s === '..')) return false;
  const m = method.toUpperCase();
  return RULES.some((r) => r.methods.includes(m) && r.match(segments));
}

/** Routes that need the client to be signed in. */
export function requiresClientSession(segments: string[], method: string): boolean {
  const [root] = segments;
  if (root === 'client' || root === 'family-members' || root === 'favorites' || root === 'notifications' || root === 'appointments') return true;
  if (root === 'auth' || root === 'bookings') return true;
  if (root === 'reviews' && method.toUpperCase() !== 'GET') return true;
  return false;
}

/** Replaces the "me" placeholder with the signed in client's email. */
export function resolveClientPath(segments: string[], email: string | null): string[] | null {
  if (segments[0] === 'client' && segments[1] === 'me') {
    if (!email) return null;
    return ['client', email, ...segments.slice(2)];
  }
  return segments;
}
