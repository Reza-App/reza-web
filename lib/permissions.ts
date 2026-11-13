/**
 * Mirror of the API permission matrix (RezaBackend/src/lib/permissions.ts).
 * The API enforces it; the dashboard uses it only to hide menus, pages and
 * buttons a profile cannot use. Keep both files in sync.
 *
 * - ADMIN (manager): everything in the salon.
 * - RECEPTIONIST (front desk): agenda, client files, cash desk, reviews.
 * - STAFF (team member): agenda and client files.
 */
const ADMINS = ['SUPER_ADMIN', 'ADMIN'] as const;
const DESK = [...ADMINS, 'RECEPTIONIST'] as const;
const TEAM = [...DESK, 'STAFF'] as const;

export const PERMISSIONS = {
  'agenda.manage': TEAM,
  'agenda.delete': DESK,
  'clients.edit': TEAM,
  'clients.admin': ADMINS,
  'cash.manage': DESK,
  'cash.delete': ADMINS,
  'reviews.view': DESK,
  'reviews.moderate': ADMINS,
  'stats.view': ADMINS,
  'salon.admin': ADMINS,
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | null | undefined, permission: Permission): boolean {
  return Boolean(role && (PERMISSIONS[permission] as readonly string[]).includes(role));
}

/** Most specific first: the first matching prefix decides. */
const ROUTES: [prefix: string, permission: Permission][] = [
  ['/dashboard/admin', 'salon.admin'],
  ['/dashboard/caisse', 'cash.manage'],
  ['/dashboard/clients/fichier-client/doublons', 'clients.admin'],
  ['/dashboard/clients/mes-avis/regles-moderation', 'reviews.moderate'],
  ['/dashboard/clients/mes-avis', 'reviews.view'],
  ['/dashboard/clients/statistiques', 'stats.view'],
  ['/dashboard/clients', 'clients.edit'],
  ['/dashboard/rendez-vous', 'agenda.manage'],
];

/** Permission a dashboard page needs (null: any signed in team member). */
export function routePermission(pathname: string): Permission | null {
  const path = pathname.split('?')[0]!;
  const hit = ROUTES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? hit[1] : null;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrateur Selia',
  ADMIN: 'Gérant',
  RECEPTIONIST: 'Accueil',
  STAFF: 'Collaborateur',
};
