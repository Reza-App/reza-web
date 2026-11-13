import { CircleAlert, Inbox, RotateCw } from 'lucide-react';

export function LoadingState({ label = 'Chargement...' }: { label?: string }) {
  // Skeleton of a typical page (cards then rows) instead of a lone spinner.
  return (
    <div role="status" aria-live="polite" className="space-y-6 py-2">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="space-y-3" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-12" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="animate-fadeUp flex flex-col items-center justify-center gap-3 py-16 text-center">
      <CircleAlert size={28} className="text-neutral-400" />
      <p className="max-w-md text-sm text-neutral-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
        >
          <RotateCw size={14} />
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="animate-fadeUp flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Inbox size={28} className="text-neutral-300" />
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
    </div>
  );
}

/** Loading / error / content switch used by every data page. */
export function QueryBoundary({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <LoadingState />;
  return <>{children}</>;
}
