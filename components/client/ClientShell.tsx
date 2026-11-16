'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarDays, Compass, Heart, LogOut, UserRound } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { PagePanelHost } from '@/components/layout/PagePanelHost';
import { ClientOnly } from '@/components/ui/client-only';
import { LoadingState } from '@/components/ui/states';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { clientAccount } from '@/lib/api/services/clientArea.service';
import { formatRelative, personName } from '@/lib/format';
import { CLIENT_LOGIN } from '@/lib/session';

const NAV = [
  { name: 'Découvrir', href: '/client', icon: Compass, exact: true },
  { name: 'Mes rendez vous', short: 'RDV', href: '/client/rendez-vous', icon: CalendarDays },
  { name: 'Favoris', href: '/client/favoris', icon: Heart },
  { name: 'Mon compte', short: 'Compte', href: '/client/profil', icon: UserRound },
];

const active = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href || pathname.startsWith('/client/salon') : pathname === href || pathname.startsWith(`${href}/`);

function ClientBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const query = useApiQuery('client-notifications', (signal) => clientAccount.notifications(signal));
  const unread = query.data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const read = async (id: string) => {
    await clientAccount.markNotificationRead(id).catch(() => undefined);
    void query.refetch();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fadeUp absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <p className="border-b border-neutral-100 px-5 py-4 text-sm font-medium text-neutral-950">Notifications</p>
          <ul className="max-h-96 overflow-y-auto">
            {(query.data?.notifications ?? []).length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-neutral-500">Aucune notification.</li>
            ) : (
              query.data!.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void read(n.id)}
                    className={`w-full border-b border-neutral-100 px-5 py-3.5 text-left last:border-b-0 hover:bg-neutral-50 ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-neutral-950">{n.title}</span>
                      {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-950" aria-hidden />}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-neutral-600">{n.message}</span>
                    <span className="mt-1 block text-xs text-neutral-400">{formatRelative(n.createdAt)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Client area frame: top bar on desktop, tab bar at the bottom on phones. */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { status, client, logout } = useClientAuth();
  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/client" className="shrink-0" aria-label="Selia, accueil">
            <Logo variant="black" height={34} />
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Navigation">
            {NAV.map(({ name, href, icon: Icon, exact }) => {
              const on = active(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${on ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
                >
                  <Icon size={16} />
                  {name}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {status === 'authenticated' && client ? (
              <>
                <ClientBell />
                <Link href="/client/profil" className="flex items-center gap-3 rounded-full p-1 pr-1 hover:bg-neutral-50 sm:pr-3" aria-label="Mon compte">
                  {client.avatar ? (
                    <Image src={client.avatar} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
                      {(client.firstName?.[0] ?? '') + (client.lastName?.[0] ?? '')}
                    </span>
                  )}
                  <span className="hidden text-sm font-medium text-neutral-900 sm:inline">{personName(client)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="hidden rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 sm:block"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : status === 'anonymous' ? (
              <Link
                href={`${CLIENT_LOGIN}?next=${encodeURIComponent(pathname)}`}
                className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Se connecter
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <ClientOnly fallback={<LoadingState />}>
          <PagePanelHost>
            <div key={pathname} className="animate-fadeUp">
              {children}
            </div>
          </PagePanelHost>
        </ClientOnly>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation">
        {NAV.map(({ name, short, href, icon: Icon, exact }) => {
          const on = active(pathname, href, exact);
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? 'text-neutral-950' : 'text-neutral-400'}`}>
              <Icon size={20} strokeWidth={on ? 2.2 : 1.8} />
              {short ?? name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
