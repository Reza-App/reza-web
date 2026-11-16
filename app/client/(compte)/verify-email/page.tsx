'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLayout, FormAlert } from '@/components/auth/AuthLayout';
import { errorMessage } from '@/lib/api/errors';
import { clientSession } from '@/lib/api/services/clientArea.service';

/** Target of the confirmation email (CLIENT_APP_URL/verify-email?token=...). */
function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'error'; message?: string }>({ status: token ? 'loading' : 'error', message: token ? undefined : 'Lien de vérification incomplet.' });

  useEffect(() => {
    if (!token) return;
    let active = true;
    clientSession
      .verifyEmail(token)
      .then((r) => active && setState({ status: 'ok', message: r.message ?? 'Votre adresse est confirmée.' }))
      .catch((e) => active && setState({ status: 'error', message: errorMessage(e) }));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthLayout audience="client">
      <h1 className="text-4xl font-medium text-neutral-950">Confirmation</h1>
      <div className="mt-8 space-y-6">
        {state.status === 'loading' && <p className="text-sm text-neutral-500">Vérification en cours...</p>}
        {state.status !== 'loading' && <FormAlert tone={state.status === 'ok' ? 'success' : 'error'}>{state.message}</FormAlert>}
        <Link href="/client/connexion" className="block w-full rounded-full bg-neutral-950 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-neutral-800">
          Se connecter
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function ClientVerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
