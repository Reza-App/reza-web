'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CreditCard, LayoutGrid, Plus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface QuickGroup {
  title: string;
  icon: LucideIcon;
  items: { label: string; href: string }[];
}

const GROUPS: QuickGroup[] = [
  {
    title: 'Agenda',
    icon: CalendarDays,
    items: [{ label: 'Créer un rendez vous', href: '/dashboard/rendez-vous?action=new' }],
  },
  {
    title: 'Clients',
    icon: Users,
    items: [
      { label: 'Créer un client', href: '/dashboard/clients/fichier-client/gestion?action=new' },
      { label: 'Règle de modération', href: '/dashboard/clients/mes-avis/regles-moderation?action=new' },
    ],
  },
  {
    title: 'Caisse',
    icon: CreditCard,
    items: [
      { label: 'Nouvelle vente', href: '/dashboard/caisse?action=sale' },
      { label: 'Mouvement de caisse', href: '/dashboard/caisse?action=movement' },
    ],
  },
  {
    title: 'Catalogue',
    icon: LayoutGrid,
    items: [
      { label: 'Créer une prestation', href: '/dashboard/admin/param-agenda/gestion-de-prestations?action=new' },
      { label: 'Créer un collaborateur', href: '/dashboard/admin/param-agenda/gestion-des-agendas?action=new' },
    ],
  },
];

/** « + » button of the top bar: every creation of the app, one click away. */
export function QuickCreateMenu() {
  const { canVisit } = usePermissions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Only the creations this profile can use.
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canVisit(i.href)) })).filter((g) => g.items.length > 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Créer"
        title="Créer"
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition duration-200 active:scale-95 ${
          open ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
        }`}
      >
        <Plus size={20} className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fadeIn absolute right-0 top-full z-50 mt-3 w-max max-w-[94vw] rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-950/5"
        >
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-[repeat(4,max-content)]">
            {groups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title}>
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-400">
                    <Icon size={18} strokeWidth={1.75} />
                    {group.title}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          className="group flex items-center gap-3 whitespace-nowrap rounded-lg px-2 py-2 text-sm text-neutral-800 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-950"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors duration-150 group-hover:bg-neutral-950 group-hover:text-white">
                            <Plus size={13} />
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
