'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ChevronsRight, CreditCard, Filter, type LucideIcon, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { usePermissions } from '@/hooks/usePermissions';
import { ADMIN_SECTIONS, CLIENT_SECTIONS, isActivePath, type NavSection } from '@/lib/navigation';

/** Square icon button of the rail, with its label as a tooltip. */
function RailButton({
  icon: Icon,
  label,
  active = false,
  open = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  open?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open || undefined}
      title={label}
      className={`group relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl transition ${
        active ? 'bg-neutral-950 text-white' : open ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950'
      }`}
    >
      <Icon size={19} />
    </button>
  );
}

/**
 * Folded sidebar: a narrow column of icons. In the admin and client areas each
 * section icon opens a small menu with its pages; elsewhere (agenda filters,
 * cash desk) the icons unfold the full sidebar.
 */
export function SidebarRail({ onExpand }: { onExpand: () => void }) {
  const pathname = usePathname() ?? '';
  const { canVisit } = usePermissions();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  // Navigating closes the menu (render time reset).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenSection(null);
  }

  useEffect(() => {
    if (!openSection) return;
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpenSection(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenSection(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openSection]);

  const all: NavSection[] | null = pathname.startsWith('/dashboard/admin') ? ADMIN_SECTIONS : pathname.startsWith('/dashboard/clients') ? CLIENT_SECTIONS : null;
  const sections = (all ?? []).map((s) => ({ ...s, links: s.links.filter((l) => canVisit(l.href)) })).filter((s) => s.links.length > 0);
  const openOne = sections.find((s) => s.title === openSection);

  return (
    <aside ref={rootRef} className="no-print sticky top-0 flex h-screen w-full flex-col items-center border-r border-neutral-200 bg-white">
      <div className="flex h-16 w-full items-center justify-center border-b border-neutral-100 lg:h-20">
        <Link href="/dashboard/rendez-vous" aria-label="Selia Pro, accueil">
          <Logo variant="pro" height={26} />
        </Link>
      </div>

      <div className="w-full border-b border-neutral-100 py-3 text-center">
        <RailButton icon={ChevronsRight} label="Afficher le menu" onClick={onExpand} />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-5" aria-label="Navigation secondaire">
        {all ? (
          sections.map((section) => (
            <RailButton
              key={section.title}
              icon={section.icon}
              label={section.title}
              active={section.links.some((l) => isActivePath(pathname, l.href))}
              open={openSection === section.title}
              onClick={() => setOpenSection((s) => (s === section.title ? null : section.title))}
            />
          ))
        ) : pathname.startsWith('/dashboard/caisse') ? (
          <RailButton icon={CreditCard} label="Périodes et filtres de caisse" onClick={onExpand} />
        ) : (
          <>
            <RailButton icon={CalendarDays} label="Calendrier" onClick={onExpand} />
            <RailButton icon={Users} label="Collaborateurs" onClick={onExpand} />
            <RailButton icon={Filter} label="Statuts" onClick={onExpand} />
          </>
        )}
      </nav>


      {openOne && (
        <div className="animate-fadeIn absolute left-full top-24 z-50 ml-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl" role="menu" aria-label={openOne.title}>
          <p className="flex items-center gap-2 px-3 pb-2 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <openOne.icon size={14} /> {openOne.title}
          </p>
          <ul className="space-y-0.5">
            {openOne.links.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    role="menuitem"
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-full px-3 py-2 text-sm transition-colors ${active ? 'bg-neutral-950 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
