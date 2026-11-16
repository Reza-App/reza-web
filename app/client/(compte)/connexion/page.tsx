'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout, Field, FormAlert, inputClass, SubmitButton } from '@/components/auth/AuthLayout';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { clientSession } from '@/lib/api/services/clientArea.service';
import { type FieldErrors, hasErrors, isValidEmail, messages, safeClientNext, validate } from '@/lib/validation';

function ClientLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useClientAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate({
      email: () => (!email.trim() ? messages.required : !isValidEmail(email) ? messages.email : null),
      password: () => (!password ? messages.required : null),
    });
    setErrors(next);
    setFormError(null);
    setInfo(null);
    setUnverified(false);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(safeClientNext(params.get('next')));
    } catch (error) {
      setFormError(errorMessage(error));
      setUnverified(error instanceof ApiError && /verif|confirm/i.test(`${error.code} ${error.message}`));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const r = await clientSession.resendVerification(email.trim());
      setInfo(r.message ?? 'Un nouvel email de confirmation a été envoyé.');
      setFormError(null);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  return (
    <AuthLayout audience="client">
      <h1 className="text-4xl font-medium text-neutral-950">Bon retour</h1>
      <p className="mt-3 text-sm text-neutral-500">Connectez vous pour réserver et suivre vos rendez vous.</p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {formError && (
          <FormAlert>
            {formError}
            {unverified && (
              <button type="button" onClick={() => void resend()} className="mt-2 block font-medium underline">
                Renvoyer l&apos;email de confirmation
              </button>
            )}
          </FormAlert>
        )}
        {info && <FormAlert tone="success">{info}</FormAlert>}
        <Field label="Email" error={errors.email}>
          <input className={inputClass} type="email" autoComplete="email" placeholder="vous@exemple.ma" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe" error={errors.password}>
          <span className="relative block">
            <input
              className={`${inputClass} pr-12`}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </Field>
        <div className="flex justify-end">
          <Link href="/client/mot-de-passe" className="text-sm text-neutral-600 hover:text-neutral-950">
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton busy={busy}>Se connecter</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-neutral-600">
        Pas encore de compte ?{' '}
        <Link href={`/client/inscription${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-neutral-950 underline">
          Créer un compte
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-neutral-400">
        Vous êtes un professionnel ?{' '}
        <Link href="/login" className="underline hover:text-neutral-700">
          Espace Selia Pro
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginForm />
    </Suspense>
  );
}
