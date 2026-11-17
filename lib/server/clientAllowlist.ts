/**
 * Public API routes still reachable from this app through /api/client/api
 * (everything else of the client area moved to the client site). Anything
 * not listed is refused.
 */
const RULES: { methods: string[]; path: string }[] = [
  { methods: ['GET'], path: 'legal' },
  { methods: ['POST'], path: 'client-errors' },
];

export function isAllowedClientPath(segments: string[], method: string): boolean {
  if (segments.length !== 1) return false;
  const m = method.toUpperCase();
  return RULES.some((r) => r.path === segments[0] && r.methods.includes(m));
}
