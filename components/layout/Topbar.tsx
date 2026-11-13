'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, Menu } from 'lucide-react';
import { QuickCreateMenu } from './QuickCreateMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationFeed } from '@/hooks/useNotificationFeed';
import { TOP_NAV } from '@/lib/navigation';
import { fullName, initials } from '@/lib/types/session';
import { usePermissions } from '@/hooks/usePermissions';
import { errorMessage } from '@/lib/api/errors';
import { useToast } from '@/components/ui/toast';
import { NotificationsPanel } from './NotificationsPanel';
import { Select } from '@/components/ui/select';


/** Top bar. Labels and profile details fold away on smaller screens. */
export function Topbar({ onOpenMenu, menuOnDesktop = false }: { onOpenMenu: () => void; menuOnDesktop?: boolean }) {
  const pathname = usePathname();
  const toast = useToast();
  const { user, salons, activeSalon, logout, switchSalon } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  const notifications = useNotificationFeed(user ? `notifications:${activeSalon?.id}` : null);
  const { refetch } = notifications;

  const name = fullName(user);
  const unread = notifications.data?.unreadCount ?? 0;
  const { canVisit } = usePermissions();
  const items = TOP_NAV.filter((item) => canVisit(item.href));

  const onSwitchSalon = async (tenantId: string) => {
    try {
      await switchSalon(tenantId);
      toast.success('Salon changé.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white/90 px-3 backdrop-blur sm:gap-4 sm:px-6 lg:h-20 lg:gap-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className={`animate-fadeIn rounded-full p-2.5 text-neutral-700 transition hover:bg-neutral-100 ${menuOnDesktop ? '' : 'lg:hidden'}`}
        aria-label="Ouvrir le menu"
        title="Afficher le menu"
      >
        <Menu size={20} />
      </button>
      <nav className="flex shrink-0 items-center gap-1" aria-label="Navigation principale">
        {items.map((item) => {
          const Icon = item.icon;
          const active = !!pathname?.startsWith(item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={item.name}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200 xl:px-4 ${
                active ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              <span className="hidden xl:inline">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <QuickCreateMenu />
        {salons.length > 1 && (
          <Select
            aria-label="Salon actif"
            value={activeSalon?.id ?? ''}
            onValueChange={(v) => onSwitchSalon(v)}
            size="sm"
            className="hidden w-48 xl:block"
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </Select>
        )}

        <button
          type="button"
          onClick={() => {
            setPanelOpen(true);
            void refetch();
          }}
          className="relative rounded-full p-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
          aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <span className="hidden h-8 w-px bg-neutral-200 xl:block" aria-hidden />

        <div className="flex items-center gap-3">
          <div className="hidden max-w-48 text-right leading-tight xl:block">
            <p className="truncate whitespace-nowrap text-sm font-semibold text-neutral-950">{name}</p>
            <p className="mt-0.5 truncate whitespace-nowrap text-xs text-neutral-500">{activeSalon?.name ?? user?.email}</p>
          </div>
          {user?.avatar ? (
            <Image src={user.avatar} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
              {initials(name) || 'S'}
            </span>
          )}
        </div>

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

      {panelOpen && (
        <NotificationsPanel feed={notifications.data} onClose={() => setPanelOpen(false)} onChanged={() => void refetch()} />
      )}
    </header>
  );
}
