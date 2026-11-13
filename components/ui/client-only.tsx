'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Renders its children only in the browser. The dashboard is entirely built
 * from live data and the current clock, so server HTML would only differ from
 * the client (hydration mismatches) without any benefit.
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{mounted ? children : fallback}</>;
}
