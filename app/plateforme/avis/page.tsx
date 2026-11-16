'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flag, RotateCcw, Star } from 'lucide-react';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader, Pagination, SegmentedControl } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { type PlatformReview, type ReviewTab, platformService } from '@/lib/api/services/platform.service';
import { formatDate } from '@/lib/format';

const EMPTY: Record<ReviewTab, string> = {
  reported: 'Aucun avis signalé par les établissements.',
  low: 'Aucun avis à 1 ou 2 étoiles.',
  removed: 'Aucun avis retiré.',
  recent: 'Aucun avis.',
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
      ))}
    </span>
  );
}

export default function PlatformReviewsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<ReviewTab>('reported');
  const [page, setPage] = useState(1);
  const query = useApiQuery(`platform-reviews:${tab}:${page}`, (signal) => platformService.reviews({ tab, page }, signal));
  const reviews = query.data?.reviews ?? [];
  const [removing, setRemoving] = useState<PlatformReview | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusy(id);
    try {
      await action();
      toast.success(message);
      await query.refetch();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    if (reason.trim().length < 3) return setError('Indiquez le motif, il est transmis au salon.');
    const ok = await act(removing.id, () => platformService.removeReview(removing.id, reason.trim()), 'Avis retiré. Le salon a été prévenu.');
    if (ok) {
      setRemoving(null);
      setReason('');
      setError(null);
    }
  };

  return (
    <div>
      <PageHeader title="Avis" description="Avis signalés par les établissements et notes basses à surveiller. Retirer un avis le masque et empêche de le republier." />
      <div className="mb-5">
        <SegmentedControl
          label="Avis"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPage(1);
          }}
          options={[
            { value: 'reported', label: `Signalés${query.data ? ` (${query.data.reportedCount})` : ''}` },
            { value: 'low', label: 'Notes basses' },
            { value: 'removed', label: 'Retirés' },
            { value: 'recent', label: 'Tous' },
          ]}
        />
      </div>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {reviews.length === 0 ? (
          <EmptyState title="Rien à signaler" description={EMPTY[tab]} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {reviews.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-950">{r.author}</p>
                    <p className="text-xs text-neutral-500">
                      {r.accountId ? (
                        <Link href={`/plateforme/etablissements/${encodeURIComponent(r.accountId)}`} className="hover:underline">
                          {r.salon}
                        </Link>
                      ) : (
                        r.salon
                      )}
                      , le {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    {r.platformRemovedAt ? <Badge tone="red">Retiré</Badge> : r.status === 'APPROVED' ? <Badge tone="green">Publié</Badge> : r.status === 'PENDING' ? <Badge tone="amber">En modération</Badge> : <Badge tone="muted">Refusé par le salon</Badge>}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">{r.comment || <span className="italic text-neutral-400">Sans commentaire</span>}</p>
                {r.reportedAt && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <Flag size={13} className="mt-0.5 shrink-0" /> Signalé le {formatDate(r.reportedAt)} : {r.reportReason}
                  </p>
                )}
                {r.platformRemovedAt && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                    Retiré le {formatDate(r.platformRemovedAt)} : {r.platformRemovedReason}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
                  {r.platformRemovedAt ? (
                    <SecondaryButton disabled={busy === r.id} onClick={() => void act(r.id, () => platformService.reviewAction(r.id, 'restore'), 'Avis rétabli : il repasse par la modération du salon.')}>
                      <RotateCcw size={15} /> Rétablir
                    </SecondaryButton>
                  ) : (
                    <>
                      {r.reportedAt && (
                        <SecondaryButton disabled={busy === r.id} onClick={() => void act(r.id, () => platformService.reviewAction(r.id, 'dismiss'), 'Signalement classé.')}>
                          Classer le signalement
                        </SecondaryButton>
                      )}
                      <SecondaryButton disabled={busy === r.id} onClick={() => setRemoving(r)} className="text-red-700">
                        Retirer l&apos;avis
                      </SecondaryButton>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={20} label="avis" onChange={setPage} />
      </QueryBoundary>

      <Modal
        open={!!removing}
        size="sm"
        title="Retirer cet avis"
        error={error}
        busy={!!busy}
        onClose={() => {
          setRemoving(null);
          setError(null);
        }}
        footer={
          <>
            <SecondaryButton onClick={() => setRemoving(null)}>Annuler</SecondaryButton>
            <PrimaryButton onClick={() => void remove()} busy={!!busy}>
              Retirer
            </PrimaryButton>
          </>
        }
      >
        <p className="mb-4 text-sm text-neutral-600">
          L&apos;avis de {removing?.author} sur {removing?.salon} sera masqué et ne pourra plus être republié, ni par le salon ni par le client.
        </p>
        <FormField label="Motif" hint="Transmis au salon. Par exemple : propos injurieux, faux avis.">
          <textarea className={`${fieldClass} min-h-20`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </Modal>
    </div>
  );
}
