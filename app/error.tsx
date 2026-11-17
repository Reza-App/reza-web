'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/errorReport';

/** A page crashed: tell the user plainly, report it, offer to retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-medium text-neutral-950">Un problème est survenu</h1>
      <p className="mt-3 text-sm text-neutral-600">La page n&apos;a pas pu s&apos;afficher. L&apos;équipe Selia a été prévenue.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          Réessayer
        </button>
        <Link href="/" className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50">
          Accueil
        </Link>
      </div>
    </div>
  );
}
