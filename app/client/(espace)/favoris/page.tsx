'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { SalonCard } from '@/components/client/SalonCard';
import { PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { clientAccount } from '@/lib/api/services/clientArea.service';

export default function ClientFavoritesPage() {
  const toast = useToast();
  const query = useApiQuery('client-favorites', (signal) => clientAccount.favorites(signal));
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (favoriteId: string) => {
    setBusyId(favoriteId);
    try {
      await clientAccount.removeFavorite(favoriteId);
      query.setData((list) => list?.filter((f) => f.id !== favoriteId));
      toast.success('Retiré de vos favoris.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Mes favoris" description="Les salons que vous aimez, à portée de clic." />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {(query.data ?? []).length === 0 ? (
          <div className="text-center">
            <EmptyState title="Aucun favori" description="Touchez le cœur sur la page d'un salon pour le retrouver ici." />
            <Link href="/client" className="mt-4 inline-block rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800">
              Découvrir des salons
            </Link>
          </div>
        ) : (
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {query.data!.map((f) => (
              <SalonCard
                key={f.id}
                salon={{ ...f.tenant, id: f.tenantId }}
                action={
                  <button
                    type="button"
                    onClick={() => void remove(f.id)}
                    disabled={busyId === f.id}
                    className="rounded-full bg-white/95 p-2.5 text-red-600 shadow-sm hover:bg-white"
                    aria-label={`Retirer ${f.tenant.name} des favoris`}
                  >
                    <Heart size={18} className="fill-current" />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
