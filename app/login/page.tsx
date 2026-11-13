'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Eye, EyeOff } from 'lucide-react';
import { AuthLayout, Field, FormAlert, inputClass, SubmitButton } from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { sessionService } from '@/lib/api/services/session.service';
import { PLATFORM_HOME } from '@/lib/session';
import {
  type FieldErrors,
  hasErrors,
  isValidEmail,
  isValidPhone,
  messages,
  normalizePhone,
  PASSWORD_MIN_LENGTH,
  safeNextPath,
  validate,
} from '@/lib/validation';

type Mode = 'login' | 'signup' | 'forgot';

function PasswordInput({
  value,
  onChange,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${inputClass} pr-12`}
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-950"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate({
      email: () => (isValidEmail(email) ? null : messages.email),
      password: () => (password ? null : messages.required),
    });
    setErrors(nextErrors);
    setFormError(null);
    setUnverified(false);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    try {
      const session = await login(email.trim(), password, remember);
      // The platform administrator has no salon: straight to the platform area.
      router.replace(session.user.role === 'SUPER_ADMIN' ? PLATFORM_HOME : safeNextPath(params.get('next')));
      router.refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setUnverified(error instanceof ApiError && error.code === 'Email not verified');
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await sessionService.resendVerification(email.trim());
      setInfo('Un nouveau lien de confirmation vient de vous être envoyé.');
      setUnverified(false);
      setFormError(null);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError && (
        <FormAlert>
          {formError}
          {unverified && (
            <button type="button" onClick={resend} className="ml-1 font-semibold underline">
              Renvoyer le lien
            </button>
          )}
        </FormAlert>
      )}
      {info && <FormAlert tone="success">{info}</FormAlert>}
      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputClass}
          placeholder="vous@salon.ma"
        />
      </Field>
      <Field label="Mot de passe" error={errors.password}>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-neutral-800">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-300 transition peer-checked:border-neutral-950 peer-checked:bg-neutral-950 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-950 peer-focus-visible:ring-offset-2"
          >
            {remember && <Check size={12} strokeWidth={3} className="text-white" />}
          </span>
          Se souvenir de moi
        </label>
        <button type="button" onClick={onForgot} className="text-sm text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline">
          Mot de passe oublié ?
        </button>
      </div>
      <SubmitButton busy={busy}>Se connecter</SubmitButton>
    </form>
  );
}

type SignupField = 'firstName' | 'lastName' | 'salonName' | 'email' | 'phone' | 'password' | 'confirm' | 'terms';

function SignupForm({ onDone }: { onDone: (email: string) => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    salonName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignupField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate<SignupField>({
      firstName: () => (form.firstName.trim() ? null : messages.required),
      lastName: () => (form.lastName.trim() ? null : messages.required),
      salonName: () => (form.salonName.trim() ? null : messages.required),
      email: () => (isValidEmail(form.email) ? null : messages.email),
      phone: () => (isValidPhone(form.phone) ? null : messages.phone),
      password: () => (form.password.length >= PASSWORD_MIN_LENGTH ? null : messages.password),
      confirm: () => (form.confirm === form.password ? null : messages.passwordMatch),
      terms: () => (terms ? null : "Merci d'accepter les conditions d'utilisation."),
    });
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    try {
      await sessionService.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        salonName: form.salonName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizePhone(form.phone),
        password: form.password,
      });
      onDone(form.email.trim());
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" error={errors.firstName}>
          <input value={form.firstName} onChange={update('firstName')} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label="Nom" error={errors.lastName}>
          <input value={form.lastName} onChange={update('lastName')} autoComplete="family-name" className={inputClass} />
        </Field>
      </div>
      <Field label="Nom du salon" error={errors.salonName}>
        <input value={form.salonName} onChange={update('salonName')} autoComplete="organization" className={inputClass} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" value={form.email} onChange={update('email')} autoComplete="email" className={inputClass} placeholder="vous@salon.ma" />
      </Field>
      <Field label="Téléphone" error={errors.phone}>
        <input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" className={inputClass} placeholder="06 12 34 56 78" />
      </Field>
      <Field label="Mot de passe" error={errors.password}>
        <PasswordInput id="new-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" />
      </Field>
      <Field label="Confirmer le mot de passe" error={errors.confirm}>
        <PasswordInput id="confirm-password" value={form.confirm} onChange={(v) => setForm((f) => ({ ...f, confirm: v }))} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-3 text-sm text-neutral-700">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-neutral-950" />
        <span>J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité de Selia.</span>
      </label>
      {errors.terms && <p className="text-xs text-red-700">{errors.terms}</p>}
      <SubmitButton busy={busy}>Créer mon espace</SubmitButton>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) return setError(messages.email);
    setBusy(true);
    setError(null);
    try {
      await sessionService.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <FormAlert tone="success">
          Si un compte existe pour {email.trim()}, un lien de réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos courriers indésirables.
        </FormAlert>
        <button type="button" onClick={onBack} className="text-sm font-medium text-neutral-950 underline underline-offset-4">
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email" error={error ?? undefined}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} placeholder="vous@salon.ma" />
      </Field>
      <SubmitButton busy={busy}>Recevoir le lien</SubmitButton>
      <button type="button" onClick={onBack} className="w-full text-sm font-medium text-neutral-600 hover:text-neutral-950">
        Retour à la connexion
      </button>
    </form>
  );
}

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: 'Bon retour', subtitle: 'Connectez vous à votre espace professionnel.' },
  signup: { title: 'Créer votre espace', subtitle: 'Ouvrez votre salon sur Selia en quelques minutes.' },
  forgot: { title: 'Mot de passe oublié', subtitle: 'Recevez un lien pour choisir un nouveau mot de passe.' },
};

function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [registered, setRegistered] = useState<string | null>(null);

  return (
    <AuthLayout>
      <h1 className="text-4xl font-medium text-neutral-950">{TITLES[mode].title}</h1>
      <p className="mb-8 mt-2 text-sm text-neutral-500">{TITLES[mode].subtitle}</p>

      {registered && mode === 'login' && (
        <div className="mb-5">
          <FormAlert tone="success">
            Votre espace est créé. Confirmez votre adresse via le lien envoyé à {registered}, puis connectez vous.
          </FormAlert>
        </div>
      )}

      {mode === 'login' && <LoginForm onForgot={() => setMode('forgot')} />}
      {mode === 'signup' && (
        <SignupForm
          onDone={(email) => {
            setRegistered(email);
            setMode('login');
          }}
        />
      )}
      {mode === 'forgot' && <ForgotForm onBack={() => setMode('login')} />}

      {mode !== 'forgot' && (
        <p className="mt-8 text-center text-sm text-neutral-600">
          {mode === 'login' ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium text-neutral-950 underline underline-offset-4 hover:no-underline"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      )}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
