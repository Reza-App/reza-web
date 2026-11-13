'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, Gauge, LogOut, ReceiptText } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { PagePanelHost } from '@/components/layout/PagePanelHost';
import { ClientOnly } from '@/components/ui/client-only';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAuth } from '@/contexts/AuthContext';
import { fullName, initials } from '@/lib/types/session';

const NAV = [
  { name: "Vue d'ensemble", href: '/plateforme', icon: Gauge },
  { name: 'Établissements', href: '/plateforme/etablissements', icon: Building2 },
  { name: 'Paiements', href: '/plateforme/paiements', icon: CreditCard },
  { name: 'Tarification', href: '/plateforme/tarification', icon: ReceiptText },
];

const isActive = (pathname: string, href: string) =>
  href === '/plateforme' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Selia platform administration area (SUPER_ADMIN). Separate from the salon
 * dashboard: the platform administrator has no salon of their own.
 */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { status, user, logout } = useAuth();
  const name = fullName(user);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/plateforme" className="flex shrink-0 items-center gap-3" aria-label="Plateforme Selia">
            <Logo variant="pro" height={30} />
            <span className="hidden rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 sm:inline">
              Plateforme
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Navigation plateforme">
            {NAV.map(({ name: label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                    active ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right leading-tight xl:block">
              <p className="text-sm font-semibold text-neutral-950">{name}</p>
              <p className="mt-0.5 text-xs text-neutral-500">Administrateur Selia</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
              {initials(name) || 'S'}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:p-8">
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
  );
}
