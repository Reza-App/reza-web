'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PeriodFilter, usePeriod } from '@/components/stats/PeriodFilter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader, Pagination, StatCard, Table } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { appointmentService } from '@/lib/api/services/appointment.service';
import { errorMessage } from '@/lib/api/errors';
import { addDays, formatDateTime, formatMoney, personName, startOfDay, startOfWeek, toISODate } from '@/lib/format';
import { type Appointment, serviceSummary } from '@/lib/types/appointment';
import type { PeriodQuery } from '@/lib/api/services/stats.service';

const PAGE_SIZE = 20;

/** Named period to an explicit date range (the appointments API takes dates). */
function toRange(q: PeriodQuery): { start?: string; end?: string } {
  if (q.startDate && q.endDate) return { start: q.startDate.slice(0, 10), end: q.endDate.slice(0, 10) };
  const now = new Date();
  const end = toISODate(now);
  switch (q.period) {
    case 'week':
      return { start: toISODate(startOfWeek(now)), end };
    case 'year':
      return { start: `${now.getFullYear()}-01-01`, end };
    case 'all':
      return {};
    default:
      return { start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), end };
  }
}

export function AppointmentHistory({ kind }: { kind: 'cancelled' | 'no-show' }) {
  const toast = useToast();
  const period = usePeriod('month');
  const [page, setPage] = useState(1);
  const [restoring, setRestoring] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);

  const range = toRange(period.query);
  const query = useApiQuery(`history:${kind}:${period.key}:${page}`, (signal) =>
    appointmentService.list(
      kind === 'cancelled'
        ? { status: 'CANCELLED', cancelledStartDate: range.start, cancelledEndDate: range.end, page, limit: PAGE_SIZE }
        : { status: 'NO_SHOW', startDate: range.start, endDate: range.end, page, limit: PAGE_SIZE },
      signal,
    ),
  );
  const rows = query.data?.appointments ?? [];
  const total = query.data?.pagination.total ?? 0;
  const lost = rows.reduce((t, a) => t + (a.totalPrice ?? 0), 0);

  const restore = async () => {
    if (!restoring) return;
    setBusy(true);
    try {
      await appointmentService.setStatus(restoring.id, 'CONFIRMED');
      toast.success('Rendez vous restauré dans l’agenda.');
      setRestoring(null);
      void query.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const future = (a: Appointment) => new Date(a.startTime) > startOfDay(addDays(new Date(), 0));

  return (
    <div>
      <PageHeader
        title={kind === 'cancelled' ? 'Rendez vous annulés' : 'Rendez vous non honorés'}
        description={
          kind === 'cancelled'
            ? 'Rendez vous annulés sur la période (date d’annulation). Un rendez vous à venir peut être restauré.'
            : 'Clients absents sans prévenir sur la période.'
        }
        actions={<PeriodFilter />}
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        <div className="mb-6 stat-grid grid-cols-1 sm:grid-cols-2">
          <StatCard info={kind === 'cancelled' ? 'Rendez vous annulés sur la période, selon la date d’annulation.' : 'Rendez vous où le client ne s’est pas présenté, sur la période.'} label={kind === 'cancelled' ? 'Annulations' : 'Absences'} badge={{ label: 'Période', tone: 'sky' }} value={total} />
          <StatCard info="Montant des prestations de ces rendez vous non réalisés." label="Chiffre d'affaires perdu" tone="red" value={formatMoney(lost)} hint={total > PAGE_SIZE ? 'sur cette page' : undefined} />
        </div>
        {rows.length === 0 ? (
          <EmptyState title={kind === 'cancelled' ? 'Aucune annulation' : 'Aucune absence'} description="Rien à signaler sur cette période." />
        ) : (
          <Table head={['Rendez vous', 'Client', 'Prestations', 'Montant', kind === 'cancelled' ? 'Annulé le' : '', '']}>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-700">{formatDateTime(a.startTime)}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-neutral-950">{personName(a.client)}</p>
                  <p className="text-xs text-neutral-400">{a.client?.phone}</p>
                </td>
                <td className="max-w-64 truncate px-5 py-3 text-neutral-600">{serviceSummary(a)}</td>
                <td className="px-5 py-3 tabular-nums">{formatMoney(a.totalPrice)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-neutral-500">{kind === 'cancelled' ? formatDateTime(a.cancelledAt) : ''}</td>
                <td className="px-5 py-3 text-right">
                  {kind === 'cancelled' && future(a) && (
                    <button
                      type="button"
                      onClick={() => setRestoring(a)}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
                    >
                      <RotateCcw size={13} /> Restaurer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total} pageSize={PAGE_SIZE} label="rendez vous" onChange={setPage} />
      </QueryBoundary>
      <ConfirmDialog
        open={!!restoring}
        title="Restaurer ce rendez vous ?"
        description="Il sera de nouveau confirmé dans l'agenda, si le créneau est toujours libre."
        confirmLabel="Restaurer"
        busy={busy}
        onConfirm={restore}
        onCancel={() => setRestoring(null)}
      />
    </div>
  );
}
