'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Pencil, Star, Trash2, UserRound } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, PageHeader, SegmentedControl } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { APPOINTMENT_STATUS_LABEL, type ClientAppointment, type ClientReview, clientAccount } from '@/lib/api/services/clientArea.service';
import { splitAppointments } from '@/lib/clientSalon';
import { formatMoney } from '@/lib/format';
import { type StatusTone } from '@/lib/status';

type Tab = 'upcoming' | 'past' | 'cancelled';

const TONES: Record<string, StatusTone> = {
  pending: 'amber',
  confirmed: 'sky',
  in_progress: 'violet',
  completed: 'green',
  cancelled: 'red',
  no_show: 'muted',
};

const REVIEW_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'En attente de validation', tone: 'amber' },
  APPROVED: { label: 'Publié', tone: 'green' },
  REJECTED: { label: 'Refusé par le salon', tone: 'red' },
};

function AppointmentCard({
  a,
  me,
  review,
  onCancel,
  onReview,
  onDeleteReview,
}: {
  a: ClientAppointment;
  me?: string;
  review?: ClientReview;
  onCancel?: () => void;
  onReview?: () => void;
  onDeleteReview?: () => void;
}) {
  const when = new Date(`${a.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-neutral-200 p-4 sm:flex-row sm:p-5">
      <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:h-28 sm:w-36">
        {a.image ? <Image src={a.image} alt="" fill unoptimized className="object-cover" sizes="160px" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href={`/client/salon/${encodeURIComponent(a.salonId)}`} className="text-lg font-medium text-neutral-950 hover:underline">
              {a.salon}
            </Link>
            <p className="text-sm text-neutral-600">{a.services?.map((s) => s.name).join(', ') || a.service}</p>
          </div>
          <Badge tone={TONES[a.status] ?? 'muted'}>{APPOINTMENT_STATUS_LABEL[a.status] ?? a.status}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-neutral-600">
          <span className="flex items-center gap-1.5 capitalize">
            <CalendarDays size={14} /> {when}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {a.time} · {a.duration}
          </span>
          {a.professional && (
            <span className="flex items-center gap-1.5">
              <UserRound size={14} /> {a.professional}
            </span>
          )}
          {a.address && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {a.address}
            </span>
          )}
        </div>
        {a.bookedFor && a.bookedFor.trim().toLowerCase() !== me?.toLowerCase() && <p className="mt-2 text-sm text-neutral-500">Pour {a.bookedFor}</p>}
        {review && (
          <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                Votre avis
                <span className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={13} className={i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
                  ))}
                </span>
              </span>
              {review.status && REVIEW_STATUS[review.status] && <Badge tone={REVIEW_STATUS[review.status]!.tone}>{REVIEW_STATUS[review.status]!.label}</Badge>}
            </div>
            {review.comment && <p className="mt-1.5 text-sm text-neutral-700">{review.comment}</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium text-neutral-950">{formatMoney(a.price)}</span>
          <div className="flex flex-wrap gap-2">
            {onReview && !review && (
              <button type="button" onClick={onReview} className="flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
                <Star size={14} /> Laisser un avis
              </button>
            )}
            {onReview && review && (
              <>
                <button type="button" onClick={onReview} className="flex items-center gap-1.5 rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100">
                  <Pencil size={14} /> Modifier mon avis
                </button>
                <button type="button" onClick={onDeleteReview} className="flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  <Trash2 size={14} /> Supprimer
                </button>
              </>
            )}
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                Annuler
              </button>
            )}
            {!onCancel && (
              <Link href={`/client/salon/${encodeURIComponent(a.salonId)}/reserver`} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50">
                Reprendre rendez vous
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ClientAppointmentsPage() {
  const toast = useToast();
  const { client } = useClientAuth();
  const query = useApiQuery('client-appointments', (signal) => clientAccount.appointments(signal));
  const groups = useMemo(() => splitAppointments(query.data ?? []), [query.data]);
  const reviewsQuery = useApiQuery('client-reviews', (signal) => clientAccount.reviews(signal));
  // One review per appointment: the existing one is edited, not duplicated.
  const reviewByAppointment = useMemo(
    () => new Map((reviewsQuery.data ?? []).filter((r) => r.appointmentId).map((r) => [r.appointmentId!, r])),
    [reviewsQuery.data],
  );
  const [deletingReview, setDeletingReview] = useState<ClientReview | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelling, setCancelling] = useState<ClientAppointment | null>(null);
  const [reviewing, setReviewing] = useState<ClientAppointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const list = groups[tab];

  const cancel = async () => {
    if (!cancelling || !client) return;
    setBusy(true);
    try {
      await clientAccount.cancel(cancelling.id, client.email);
      toast.success('Rendez vous annulé.');
      setCancelling(null);
      await query.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const editing = reviewing ? reviewByAppointment.get(reviewing.id) : undefined;

  const openReview = (a: ClientAppointment) => {
    const existing = reviewByAppointment.get(a.id);
    setRating(existing?.rating ?? 5);
    setComment(existing?.comment ?? '');
    setReviewing(a);
  };

  const sendReview = async () => {
    if (!reviewing || !client) return;
    setBusy(true);
    try {
      if (editing) {
        await clientAccount.updateReview(editing.id, { email: client.email, rating, comment: comment.trim() });
        toast.success('Avis modifié. Il repasse par la validation du salon.');
      } else {
        await clientAccount.addReview({
          tenantId: reviewing.salonId,
          appointmentId: reviewing.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Merci pour votre avis, il sera publié après validation par le salon.');
      }
      setReviewing(null);
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
      // Reviewed meanwhile (another tab, the app): show the existing review.
      void reviewsQuery.refetch();
    } finally {
      setBusy(false);
    }
  };

  const deleteReview = async () => {
    if (!deletingReview || !client) return;
    setBusy(true);
    try {
      await clientAccount.removeReview(deletingReview.id, client.email);
      toast.success('Avis supprimé. Vous pouvez en laisser un nouveau.');
      setDeletingReview(null);
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Mes rendez vous" description="Vos réservations, passées et à venir." />
      <div className="mb-6">
        <SegmentedControl
          label="Rendez vous"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: `À venir (${groups.upcoming.length})` },
            { value: 'past', label: `Passés (${groups.past.length})` },
            { value: 'cancelled', label: `Annulés (${groups.cancelled.length})` },
          ]}
        />
      </div>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {list.length === 0 ? (
          <EmptyState
            title={tab === 'upcoming' ? 'Aucun rendez vous à venir' : 'Rien ici pour le moment'}
            description={tab === 'upcoming' ? 'Trouvez un salon et réservez en quelques clics.' : undefined}
          />
        ) : (
          <div className="stagger space-y-4">
            {list.map((a) => (
              <AppointmentCard
                key={a.id}
                a={a}
                me={client ? `${client.firstName} ${client.lastName}`.trim() : undefined}
                onCancel={tab === 'upcoming' ? () => setCancelling(a) : undefined}
                review={reviewByAppointment.get(a.id)}
                onReview={tab === 'past' && a.status === 'completed' ? () => openReview(a) : undefined}
                onDeleteReview={() => {
                  const r = reviewByAppointment.get(a.id);
                  if (r) setDeletingReview(r);
                }}
              />
            ))}
          </div>
        )}
        {tab === 'upcoming' && groups.upcoming.length === 0 && (
          <div className="mt-6 text-center">
            <Link href="/client" className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800">
              Trouver un salon
            </Link>
          </div>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={!!cancelling}
        title="Annuler ce rendez vous ?"
        description={cancelling ? `${cancelling.salon}, le ${cancelling.date.split('-').reverse().join('/')} à ${cancelling.time}. Le salon peut refuser une annulation trop tardive : contactez le alors directement.` : ''}
        confirmLabel="Annuler le rendez vous"
        cancelLabel="Garder"
        destructive
        busy={busy}
        onConfirm={() => void cancel()}
        onCancel={() => setCancelling(null)}
      />

      <ConfirmDialog
        open={!!deletingReview}
        title="Supprimer votre avis ?"
        description="Il ne sera plus visible sur la page du salon. Vous pourrez ensuite en laisser un nouveau pour ce rendez vous."
        confirmLabel="Supprimer l'avis"
        destructive
        busy={busy}
        onConfirm={() => void deleteReview()}
        onCancel={() => setDeletingReview(null)}
      />

      <Modal
        open={!!reviewing}
        title={editing ? 'Modifier votre avis' : 'Votre avis'}
        size="sm"
        busy={busy}
        onClose={() => setReviewing(null)}
        footer={
          <>
            <SecondaryButton onClick={() => setReviewing(null)} disabled={busy}>
              Annuler
            </SecondaryButton>
            <PrimaryButton onClick={() => void sendReview()} busy={busy}>
              {editing ? 'Enregistrer' : "Publier l'avis"}
            </PrimaryButton>
          </>
        }
      >
        <p className="mb-4 text-sm text-neutral-600">{reviewing?.salon}</p>
        <div className="mb-5 flex gap-1" role="radiogroup" aria-label="Note">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`} onClick={() => setRating(n)} className="p-1">
              <Star size={28} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
            </button>
          ))}
        </div>
        <FormField label="Commentaire (facultatif)">
          <textarea className={`${fieldClass} min-h-28`} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </FormField>
      </Modal>
    </div>
  );
}
