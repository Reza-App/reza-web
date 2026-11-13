import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8 text-center">
      <Logo variant="black" height={72} />
      <h1 className="text-3xl font-medium text-neutral-950">Page introuvable</h1>
      <p className="max-w-md text-sm text-neutral-500">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link
        href="/dashboard/rendez-vous"
        className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Retour à l&apos;agenda
      </Link>
    </main>
  );
}
