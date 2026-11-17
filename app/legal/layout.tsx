import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { CLIENT_SITE_URL } from '@/lib/session';

const LINKS = [
  { href: '/legal/cgu', label: 'Conditions clients' },
  { href: '/legal/cgu-etablissements', label: 'Conditions établissements' },
  { href: '/legal/mentions-legales', label: 'Mentions légales' },
];

export const metadata: Metadata = { robots: { index: true, follow: true } };

/** Public legal pages: readable without an account, from the app or the site. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href={CLIENT_SITE_URL} aria-label="Selia, accueil">
            <Logo variant="black" height={30} />
          </a>
          <a href={CLIENT_SITE_URL} className="text-sm text-neutral-600 hover:text-neutral-950">
            Retour à Selia
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</main>
      <footer className="border-t border-neutral-200">
        <nav className="mx-auto flex max-w-4xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-neutral-500 sm:px-6" aria-label="Pages légales">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-neutral-950">
              {l.label}
            </Link>
          ))}
          <a href={`${CLIENT_SITE_URL}/confidentialite`} className="hover:text-neutral-950">
            Confidentialité
          </a>
        </nav>
      </footer>
    </div>
  );
}
