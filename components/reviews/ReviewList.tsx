'use client';

import { useState } from 'react';
import { Check, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, Badge, Card, PageHeader, Pagination, SegmentedControl, StatCard } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useUrlState } from '@/hooks/useUrlState';
import { type Review, type ReviewStatus, reviewService } from '@/lib/api/services/review.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatNumber, personName } from '@/lib/format';

const PAGE_SIZE = 20;

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= value ? 'fill-neutral-950 text-neutral-950' : 'text-neutral-300'} />
      ))}
    </span>
  );
}

const COPY: Record<ReviewStatus, { title: string; description: string; empty: string }> = {
  PENDING: {
    title: 'Avis à modérer',
    description: 'Les avis laissés par vos clients attendent votre validation avant publication sur votre page.',
    empty: 'Aucun avis en attente.',
  },
  APPROVED: {
    title: 'Avis publiés',
    description: 'Avis visibles sur votre page Selia. Vous pouvez les retirer à tout moment.',
    empty: 'Aucun avis publié pour le moment.',
  },
  REJECTED: {
    title: 'Avis refusés',
    description: 'Avis non publiés. Vous pouvez les remettre en modération ou les supprimer.',
    empty: 'Aucun avis refusé.',
  },
};

type RatingFilter = 'all' | '5' | '4' | '3' | 'low';

export function ReviewList({ status }: { status: ReviewStatus }) {
  const toast = useToast();
  const { get, set } = useUrlState();
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const [rating, setRating] = useState<RatingFilter>('all');
  const [rejecting, setRejecting] = useState<Review | null>(null);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState<Review | null>(null);
  const canModerate = usePermissions().can('reviews.moderate');
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useApiQuery(`reviews:${status}:${page}`, (signal) => reviewService.list({ status, page, limit: PAGE_SIZE }, signal));
  const stats = useApiQuery('review-stats', (signal) => reviewService.stats(signal));

  const refresh = () => {
    void query.refetch();
    void stats.refetch();
  };

  const act = async (review: Review, next: ReviewStatus, rejectReason?: string) => {
    setBusyId(review.id);
    try {
      await reviewService.setStatus(review.id, next, rejectReason);
      toast.success(next === 'APPROVED' ? 'Avis publié.' : next === 'REJECTED' ? 'Avis refusé.' : 'Avis remis en modération.');
      setRejecting(null);
      setReason('');
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await reviewService.remove(deleting.id);
      toast.success('Avis supprimé.');
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const reviews = (query.data?.reviews ?? []).filter((r) => (rating === 'all' ? true : rating === 'low' ? r.rating <= 2 : r.rating === Number(rating)));
  const s = stats.data?.stats;

  return (
    <div>
      <PageHeader title={COPY[status].title} description={COPY[status].description} />

      {s && (
        <div className="mb-6 stat-grid grid-cols-2 lg:grid-cols-4">
          <StatCard
            info="Moyenne des notes de tous les avis, de 1 à 5."
            label="Note moyenne"
            badge={{ label: 'Sur 5', tone: 'sky' }}
            value={formatNumber(s.averageRating, 1)}
          />
          <StatCard
            info="Avis qui attendent votre décision avant publication."
            label="À modérer"
            badge={{ label: 'À suivre', tone: 'amber' }}
            tone="amber"
            value={s.pendingReviews}
          />
          <StatCard info="Avis visibles sur votre page Selia." label="Publiés" tone="green" value={s.approvedReviews} />
          <StatCard info="Avis non publiés, refusés par vous ou par vos règles." label="Refusés" tone="red" value={s.rejectedReviews} />
        </div>
      )}

      <div className="mb-5 flex justify-end">
        <SegmentedControl<RatingFilter>
          label="Note"
          value={rating}
          onChange={setRating}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: '5', label: '5 étoiles' },
            { value: '4', label: '4 étoiles' },
            { value: '3', label: '3 étoiles' },
            { value: 'low', label: '2 et moins' },
          ]}
        />
      </div>

      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {reviews.length === 0 ? (
          <EmptyState title={COPY[status].empty} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {reviews.map((review) => {
              const busy = busyId === review.id;
              return (
                <Card key={review.id}>
                  <div className="flex items-start gap-4">
                    <Avatar name={personName(review.client)} src={review.client?.avatar} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-neutral-950">{personName(review.client) || 'Client'}</p>
                        <span className="text-xs text-neutral-400">{formatDate(review.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <Stars value={review.rating} />
                        {review.employee && <span className="text-xs text-neutral-500">avec {personName(review.employee)}</span>}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                        {review.comment || <span className="italic text-neutral-400">Sans commentaire</span>}
                      </p>
                      {review.rejectReason && (
                        <p className="mt-3">
                          <Badge tone="danger">Motif : {review.rejectReason}</Badge>
                        </p>
                      )}
                    </div>
                  </div>
                  {canModerate && (
                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
                      {status === 'REJECTED' && (
                        <SecondaryButton onClick={() => setDeleting(review)} disabled={busy} className="mr-auto text-red-700">
                          <Trash2 size={15} /> Supprimer
                        </SecondaryButton>
                      )}
                      {status !== 'PENDING' && (
                        <SecondaryButton onClick={() => act(review, 'PENDING')} disabled={busy}>
                          <RotateCcw size={15} /> {status === 'APPROVED' ? 'Retirer' : 'Remettre en modération'}
                        </SecondaryButton>
                      )}
                      {status !== 'REJECTED' && (
                        <SecondaryButton onClick={() => setRejecting(review)} disabled={busy}>
                          <X size={15} /> Refuser
                        </SecondaryButton>
                      )}
                      {status !== 'APPROVED' && (
                        <PrimaryButton onClick={() => act(review, 'APPROVED')} busy={busy}>
                          <Check size={15} /> Publier
                        </PrimaryButton>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={query.data?.pagination.totalPages ?? 1}
          total={query.data?.pagination.total}
          pageSize={PAGE_SIZE}
          label="avis"
          onChange={(p) => set({ page: p === 1 ? null : String(p) })}
        />
      </QueryBoundary>

      <Modal
        open={!!rejecting}
        size="sm"
        title="Refuser cet avis"
        onClose={() => setRejecting(null)}
        busy={!!busyId}
        footer={
          <>
            <SecondaryButton onClick={() => setRejecting(null)}>Annuler</SecondaryButton>
            <PrimaryButton busy={!!busyId} onClick={() => rejecting && act(rejecting, 'REJECTED', reason.trim() || undefined)}>
              Refuser
            </PrimaryButton>
          </>
        }
      >
        <FormField label="Motif (facultatif)" hint="Visible uniquement par votre équipe.">
          <textarea className={fieldClass} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cet avis ?"
        description="L'avis sera définitivement supprimé."
        confirmLabel="Supprimer"
        destructive
        busy={!!busyId}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
