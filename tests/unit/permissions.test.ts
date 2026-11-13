import { describe, expect, it } from 'vitest';
import { can, routePermission } from '@/lib/permissions';

describe('routePermission', () => {
  it('maps each dashboard area to its permission, most specific first', () => {
    expect(routePermission('/dashboard/admin/journal')).toBe('salon.admin');
    expect(routePermission('/dashboard/caisse?period=year')).toBe('cash.manage');
    expect(routePermission('/dashboard/clients/fichier-client/doublons')).toBe('clients.admin');
    expect(routePermission('/dashboard/clients/fichier-client/gestion')).toBe('clients.edit');
    expect(routePermission('/dashboard/clients/mes-avis/regles-moderation')).toBe('reviews.moderate');
    expect(routePermission('/dashboard/clients/mes-avis/avis-a-moderer')).toBe('reviews.view');
    expect(routePermission('/dashboard/clients/statistiques/meilleurs-clients')).toBe('stats.view');
    expect(routePermission('/dashboard/rendez-vous')).toBe('agenda.manage');
  });

  it('does not confuse a prefix with a longer path', () => {
    expect(routePermission('/dashboard/caissexyz')).toBeNull();
  });
});

describe('profiles', () => {
  const visible = (role: string, path: string) => {
    const p = routePermission(path);
    return p === null || can(role, p);
  };

  it('team member: agenda and client files only', () => {
    expect(visible('STAFF', '/dashboard/rendez-vous')).toBe(true);
    expect(visible('STAFF', '/dashboard/clients/fichier-client/gestion')).toBe(true);
    expect(visible('STAFF', '/dashboard/caisse')).toBe(false);
    expect(visible('STAFF', '/dashboard/admin/journal')).toBe(false);
    expect(visible('STAFF', '/dashboard/clients/statistiques/nouveaux-clients')).toBe(false);
  });

  it('front desk: cash desk and reviews, no settings', () => {
    expect(visible('RECEPTIONIST', '/dashboard/caisse')).toBe(true);
    expect(visible('RECEPTIONIST', '/dashboard/clients/mes-avis/avis-moderes')).toBe(true);
    expect(visible('RECEPTIONIST', '/dashboard/clients/mes-avis/regles-moderation')).toBe(false);
    expect(visible('RECEPTIONIST', '/dashboard/admin/param-agenda/gestion-de-prestations')).toBe(false);
  });

  it('manager: everything', () => {
    expect(visible('ADMIN', '/dashboard/admin/journal')).toBe(true);
    expect(visible('ADMIN', '/dashboard/clients/fichier-client/doublons')).toBe(true);
  });
});
