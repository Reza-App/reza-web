'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  History,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { PlatformBell } from '@/components/platform/PlatformBell';
import { PagePanelHost } from '@/components/layout/PagePanelHost';
import { ClientOnly } from '@/components/ui/client-only';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { platformService } from '@/lib/api/services/platform.service';
import { fullName, initials } from '@/lib/types/session';

/** Pages of the platform, grouped like the salon dashboard sidebar. */
const SECTIONS = [
  {
    title: 'Pilotage',
    links: [
      { name: "Vue d'ensemble", href: '/plateforme', icon: Gauge },
      { name: 'Établissements', href: '/plateforme/etablissements', icon: Building2 },
      { name: 'Clients', href: '/plateforme/clients', icon: Users },
    ],
  },
  {
    title: 'Finances',
    links: [
      { name: 'Paiements', href: '/plateforme/paiements', icon: CreditCard },
      { name: 'Factures', href: '/plateforme/factures', icon: FileText },
      { name: 'Tarification', href: '/plateforme/tarification', icon: ReceiptText },
    ],
  },
  {
    title: 'Modération',
    links: [
      { name: 'Avis', href: '/plateforme/avis', icon: MessageSquareText },
      { name: 'Messages', href: '/plateforme/messages', icon: Megaphone },
    ],
  },
  {
    title: 'Administration',
    links: [
      { name: 'Journal', href: '/plateforme/journal', icon: History },
      { name: 'Compte et administrateurs', href: '/plateforme/compte', icon: ShieldCheck },
    ],
  },
];

const isActive = (pathname: string, href: string) =>
  href === '/plateforme' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6" aria-label="Navigation plateforme">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{section.title}</p>
          <ul className="space-y-0.5">
            {section.links.map(({ name, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors ${
                      active ? 'bg-neutral-950 text-white' : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                    }`}
                  >
                    <Icon size={17} />
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/plateforme" className="flex items-end gap-2.5" aria-label="Plateforme Selia">
      <Logo variant="pro" height={30} />
      <span className="mb-0.5 border-l border-neutral-200 pl-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">Admin</span>
    </Link>
  );
}

/** Section and page of the current route, for the top bar. */
function locate(pathname: string): { section: string; page: string; parent?: { name: string; href: string } } | null {
  for (const section of SECTIONS) {
    for (const link of section.links) {
      if (pathname === link.href) return { section: section.title, page: link.name };
      if (link.href !== '/plateforme' && pathname.startsWith(`${link.href}/`)) {
        return { section: section.title, page: 'Fiche', parent: { name: link.name, href: link.href } };
      }
    }
  }
  return null;
}

/** Breadcrumb on the left, shortcut to the virements waiting on the right. */
function TopbarContext({ pathname }: { pathname: string }) {
  const here = locate(pathname);
  const overview = useApiQuery('platform-overview', (signal) => platformService.overview(signal));
  const pending = overview.data?.pendingPayments ?? 0;
  return (
    <>
      {here && (
        <nav aria-label="Fil d'Ariane" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span className="text-neutral-400">{here.section}</span>
          <ChevronRight size={14} className="text-neutral-300" />
          {here.parent && (
            <>
              <Link href={here.parent.href} className="text-neutral-500 hover:text-neutral-950">
                {here.parent.name}
              </Link>
              <ChevronRight size={14} className="text-neutral-300" />
            </>
          )}
          <span className="truncate font-medium text-neutral-950">{here.page}</span>
        </nav>
      )}
      <div className="flex-1" />
      {pending > 0 && (
        <Link
          href="/plateforme/paiements"
          className="hidden items-center gap-2 rounded-full bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100 sm:inline-flex"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          {pending} virement{pending > 1 ? 's' : ''} à vérifier
        </Link>
      )}
    </>
  );
}

/**
 * Selia platform administration area (SUPER_ADMIN), with a sidebar like the
 * salon dashboard. Separate from it: the administrator has no salon.
 */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { status, user, logout } = useAuth();
  const name = fullName(user);
  const [drawer, setDrawer] = useState(false);

  // Navigating closes the phone drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-neutral-100 px-6">
          <Brand />
        </div>
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="animate-fadeIn relative flex h-full w-[280px] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Fermer le menu">
                <X size={20} />
              </button>
            </div>
            <SidebarNav pathname={pathname} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} className="rounded-full p-2.5 text-neutral-700 hover:bg-neutral-100 lg:hidden" aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <Logo variant="pro" height={26} />
          </div>
          {user?.role === 'SUPER_ADMIN' ? <TopbarContext pathname={pathname} /> : <div className="flex-1" />}
          {user?.role === 'SUPER_ADMIN' && <PlatformBell />}
          <span className="hidden h-8 w-px bg-neutral-200 xl:block" aria-hidden />
          <Link href="/plateforme/compte" className="flex items-center gap-3 rounded-full p-1 hover:bg-neutral-50" aria-label="Mon compte">
            <span className="hidden text-right leading-tight xl:block">
              <span className="block text-sm font-semibold text-neutral-950">{name}</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Administrateur Selia</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">{initials(name) || 'S'}</span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut size={20} />
          </button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:p-8">
          <ClientOnly fallback={<LoadingState />}>
            {status === 'loading' ? (
              <LoadingState />
            ) : user?.role !== 'SUPER_ADMIN' ? (
              <ErrorState message="Cet espace est réservé à l'administration de la plateforme Selia." />
            ) : (
              <PagePanelHost>
                <div key={pathname} className="animate-fadeUp">
                  {children}
                </div>
              </PagePanelHost>
            )}
          </ClientOnly>
        </main>
      </div>
    </div>
  );
}
