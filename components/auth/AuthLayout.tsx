import { Logo } from '@/components/brand/Logo';
import { AuthCarousel } from './AuthCarousel';

/** Split screen used by every account page: brand photos and form. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <div className="lg:sticky lg:top-0 lg:h-screen">
        <AuthCarousel />
      </div>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Logo variant="pro" height={44} priority />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-800">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-950 placeholder:text-neutral-400 transition focus:border-neutral-400 focus:ring-4 focus:ring-neutral-950/5 focus:outline-none disabled:bg-neutral-50';

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? 'Patientez...' : children}
    </button>
  );
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm ${
        tone === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-neutral-200 bg-neutral-50 text-neutral-800'
      }`}
    >
      {children}
    </div>
  );
}
