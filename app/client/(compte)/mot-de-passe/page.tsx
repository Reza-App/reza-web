'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout, Field, FormAlert, inputClass, SubmitButton } from '@/components/auth/AuthLayout';
import { errorMessage } from '@/lib/api/errors';
import { clientSession } from '@/lib/api/services/clientArea.service';
import { CLIENT_PASSWORD_MIN_LENGTH, isValidEmail, messages } from '@/lib/validation';

/** Forgotten password, as in the app: a 6 digit code by email, then a new password. */
export default function ClientForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) return setError(messages.email);
    setBusy(true);
    setError(null);
    try {
      const r = await clientSession.forgotCode(email.trim().toLowerCase());
      setInfo(r.message ?? 'Si un compte existe pour cette adresse, un code vous a été envoyé.');
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError('Le code reçu contient 6 chiffres.');
    if (password.length < CLIENT_PASSWORD_MIN_LENGTH) return setError(`Au moins ${CLIENT_PASSWORD_MIN_LENGTH} caractères.`);
    if (password !== confirm) return setError(messages.passwordMatch);
    setBusy(true);
    setError(null);
    try {
      await clientSession.resetPassword(email.trim().toLowerCase(), code.trim(), password);
      setStep('done');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout audience="client">
      <h1 className="text-4xl font-medium text-neutral-950">Mot de passe oublié</h1>
      {step === 'email' && (
        <form onSubmit={sendCode} className="mt-8 space-y-5" noValidate>
          <p className="text-sm text-neutral-500">Indiquez votre email : vous recevrez un code de vérification.</p>
          {error && <FormAlert>{error}</FormAlert>}
          <Field label="Email">
            <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <SubmitButton busy={busy}>Recevoir un code</SubmitButton>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={reset} className="mt-8 space-y-5" noValidate>
          {info && <FormAlert tone="success">{info}</FormAlert>}
          {error && <FormAlert>{error}</FormAlert>}
          <Field label="Code reçu par email">
            <input className={`${inputClass} tracking-[0.4em]`} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Nouveau mot de passe">
            <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirmation">
            <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <SubmitButton busy={busy}>Changer le mot de passe</SubmitButton>
        </form>
      )}
      {step === 'done' && (
        <div className="mt-8 space-y-6">
          <FormAlert tone="success">Votre mot de passe a été modifié. Vous pouvez vous connecter.</FormAlert>
          <Link href="/client/connexion" className="block w-full rounded-full bg-neutral-950 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-neutral-800">
            Se connecter
          </Link>
        </div>
      )}
      <p className="mt-8 text-center text-sm text-neutral-600">
        <Link href="/client/connexion" className="underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  );
}
