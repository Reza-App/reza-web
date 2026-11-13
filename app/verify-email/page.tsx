'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLayout, FormAlert } from '@/components/auth/AuthLayout';
import { LoadingState } from '@/components/ui/states';
import { errorMessage } from '@/lib/api/errors';
import { sessionService } from '@/lib/api/services/session.service';

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [state, setState] = useState<'pending' | 'done' | 'error'>(token && email ? 'pending' : 'error');
  const [message, setMessage] = useState(token && email ? '' : 'Ce lien de confirmation est incomplet.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || !email || started.current) return;
    started.current = true;
    sessionService
      .verifyEmail(token, email)
      .then(() => setState('done'))
      .catch((err) => {
        setState('error');
        setMessage(errorMessage(err));
      });
  }, [token, email]);

  if (state === 'pending') return <LoadingState label="Confirmation en cours..." />;
  return (
    <div className="space-y-6">
      {state === 'done' ? (
        <FormAlert tone="success">Votre adresse est confirmée. Vous pouvez vous connecter.</FormAlert>
      ) : (
        <FormAlert>{message}</FormAlert>
      )}
      <Link href="/login" className="inline-block rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white">
        Aller à la connexion
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <h1 className="mb-8 text-4xl font-medium text-neutral-950">Confirmation de l&apos;email</h1>
      <Suspense fallback={null}>
        <VerifyEmail />
      </Suspense>
    </AuthLayout>
  );
}
