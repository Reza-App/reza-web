'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLayout, Field, FormAlert, inputClass, SubmitButton } from '@/components/auth/AuthLayout';
import { errorMessage } from '@/lib/api/errors';
import { sessionService } from '@/lib/api/services/session.service';
import { messages, PASSWORD_MIN_LENGTH } from '@/lib/validation';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) return setError(messages.password);
    if (password !== confirm) return setError(messages.passwordMatch);
    setBusy(true);
    setError(null);
    try {
      await sessionService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <FormAlert>Ce lien est incomplet. Demandez un nouveau lien depuis la page de connexion.</FormAlert>;

  if (done) {
    return (
      <div className="space-y-6">
        <FormAlert tone="success">Votre mot de passe a été modifié.</FormAlert>
        <Link href="/login" className="inline-block rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <FormAlert>{error}</FormAlert>}
      <Field label="Nouveau mot de passe">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Confirmer le mot de passe">
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
      </Field>
      <SubmitButton busy={busy}>Enregistrer</SubmitButton>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <h1 className="mb-8 text-4xl font-medium text-neutral-950">Nouveau mot de passe</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
