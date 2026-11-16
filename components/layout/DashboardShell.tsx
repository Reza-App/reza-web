'use client';

import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { ClientOnly } from '@/components/ui/client-only';
import { LoadingState } from '@/components/ui/states';
import { PagePanelHost } from './PagePanelHost';
import { RouteGuard } from './RouteGuard';
import { Sidebar } from './Sidebar';
import { SidebarRail } from './SidebarRail';
import { Topbar } from './Topbar';

/**
 * Dashboard frame. From 1024 px the sidebar is a fixed column; below it
 * becomes a drawer opened from the top bar, closed on every navigation.
 */
/** Desktop sidebar folded state, remembered per browser (convenience only). */
const COLLAPSE_KEY = 'selia.sidebarCollapsed';
const COLLAPSE_EVENT = 'selia:sidebar';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    // Storage blocked (private mode): the choice simply is not remembered.
  }
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  // The menu button opens the drawer on small screens, unfolds the column on desktop.
  const openMenu = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) writeCollapsed(false);
    else setDrawerOpen(true);
  }, []);

  // Navigating closes the drawer (render time reset, no effect needed).
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop column: full sidebar, or a rail of icons once folded. */}
      <div
        className={`sticky top-0 z-30 hidden h-screen shrink-0 self-start transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          collapsed ? 'w-[76px]' : 'w-[264px] overflow-hidden'
        }`}
      >
        {collapsed ? (
          <SidebarRail onExpand={() => writeCollapsed(false)} />
        ) : (
          <div className="w-[264px]">
            <Sidebar onCollapse={() => writeCollapsed(true)} />
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="animate-overlayIn absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
          />
          <div className="animate-slideInLeft relative h-full w-[280px] max-w-[85vw] shadow-2xl">
            <Sidebar onCollapse={() => setDrawerOpen(false)} collapseLabel="Fermer le menu" />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={openMenu} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:p-8">
          <ClientOnly fallback={<LoadingState />}>
            <PagePanelHost>
              {/* Keyed by path: each page enters with a short fade. */}
              <div key={pathname} className="animate-fadeUp">
                <Suspense fallback={<LoadingState />}>
                  <RouteGuard>{children}</RouteGuard>
                </Suspense>
              </div>
            </PagePanelHost>
          </ClientOnly>
        </main>
      </div>
    </div>
  );
}
