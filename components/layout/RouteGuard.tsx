'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { usePermissions } from '@/hooks/usePermissions';

/** Hides a page the profile cannot use (the API refuses it anyway). */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { status } = useAuth();
  const { canVisit } = usePermissions();
  if (status === 'loading') return <LoadingState />;
  if (!canVisit(pathname)) {
    return <ErrorState message="Votre profil n'a pas accès à cette page. Demandez au gérant du salon si vous en avez besoin." />;
  }
  return <>{children}</>;
}
