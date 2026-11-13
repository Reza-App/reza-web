'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ClientOnly } from '@/components/ui/client-only';
import { ADMIN_SECTIONS, CLIENT_SECTIONS } from '@/lib/navigation';
import { AgendaSidebar } from './AgendaSidebar';
import { CaisseSidebar } from './CaisseSidebar';
import { NavSectionList } from './NavSectionList';

function SidebarContent({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/dashboard/admin')) return <NavSectionList sections={ADMIN_SECTIONS} />;
  if (pathname.startsWith('/dashboard/clients')) return <NavSectionList sections={CLIENT_SECTIONS} />;
  if (pathname.startsWith('/dashboard/caisse')) return <CaisseSidebar />;
  return <AgendaSidebar />;
}

/**
 * Left column: Selia Pro wordmark and the navigation of the current area.
 * `onCollapse` shows the small arrow that folds it away (desktop) or
 * closes the drawer (mobile).
 */
export function Sidebar({ onCollapse, collapseLabel = 'Masquer le menu' }: { onCollapse?: () => void; collapseLabel?: string }) {
  const pathname = usePathname() ?? '';
  return (
    <aside className="no-print sticky top-0 flex h-screen w-full flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center justify-between border-b border-neutral-100 pl-7 pr-3 lg:h-20">
        <Link href="/dashboard/rendez-vous" aria-label="Selia Pro, accueil">
          <Logo variant="pro" height={46} priority />
        </Link>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="rounded-full p-2 text-neutral-400 transition duration-200 hover:bg-neutral-100 hover:text-neutral-950"
          >
            <ChevronsLeft size={18} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <ClientOnly>
          <Suspense fallback={null}>
            <SidebarContent pathname={pathname} />
          </Suspense>
        </ClientOnly>
      </div>
    </aside>
  );
}
