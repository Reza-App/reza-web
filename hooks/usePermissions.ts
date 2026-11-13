'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { can, type Permission, routePermission } from '@/lib/permissions';

/** Permission checks for the signed in profile (display only, the API enforces). */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const allowed = useCallback((permission: Permission) => can(role, permission), [role]);
  const canVisit = useCallback(
    (href: string) => {
      const needed = routePermission(href);
      return needed === null || can(role, needed);
    },
    [role],
  );
  return { role, can: allowed, canVisit };
}
