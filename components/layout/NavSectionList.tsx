'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { isActivePath, type NavSection } from '@/lib/navigation';
import { usePermissions } from '@/hooks/usePermissions';

/** Collapsible link groups; the group holding the current page starts open. */
export function NavSectionList({ sections: all }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const { canVisit } = usePermissions();
  // Only the pages this profile can open.
  const sections = all.map((s) => ({ ...s, links: s.links.filter((l) => canVisit(l.href)) })).filter((s) => s.links.length > 0);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((section, index) => {
      const hasActive = section.links.some((l) => isActivePath(pathname, l.href));
      initial[section.title] = hasActive || (index === 0 && !sections.some((s) => s.links.some((l) => isActivePath(pathname, l.href))));
    });
    return initial;
  });

  return (
    <nav className="space-y-5" aria-label="Navigation secondaire">
      {sections.map((section) => {
        const Icon = section.icon;
        const expanded = !!open[section.title];
        const panelId = `nav-${section.title.replace(/\W+/g, '-').toLowerCase()}`;
        return (
          <div key={section.title} className="space-y-2">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen((s) => ({ ...s, [section.title]: !s[section.title] }))}
              className="group flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 transition-colors group-hover:text-neutral-950">
                <Icon size={14} />
                {section.title}
              </span>
              <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <ul id={panelId} className="animate-fadeIn space-y-0.5">
                {section.links.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-full px-3 py-2 text-sm transition-colors ${
                          active ? 'bg-neutral-950 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
