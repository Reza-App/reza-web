'use client';

import { useState } from 'react';
import { Clock, Mail, Phone, User } from 'lucide-react';
import { Modal, SecondaryButton } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { appointmentService } from '@/lib/api/services/appointment.service';
import { errorMessage } from '@/lib/api/errors';
import { formatDuration, formatMoney, personName, toTimeLabel } from '@/lib/format';
import { type Appointment, type AppointmentStatus, appointmentClientName, isWalkInAppointment, statusLabel } from '@/lib/types/appointment';
import { APPOINTMENT_STATUS_TONES, statusTone } from '@/lib/status';
import { Badge } from '@/components/ui/page';

/** Allowed next statuses from the current one (front side guard). */
const TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
};

const ACTION_LABELS: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: 'Confirmer',
  IN_PROGRESS: 'Démarrer',
  COMPLETED: 'Marquer terminé',
  NO_SHOW: 'Client absent',
};

export function AppointmentDetailsDialog({
  appointment,
  onClose,
  onChanged,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!appointment) return null;
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const next = TRANSITIONS[appointment.status] ?? [];
  const cancellable = !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status);

  const changeStatus = async (status: AppointmentStatus) => {
    setBusy(true);
    try {
      await appointmentService.setStatus(appointment.id, status);
      toast.success(`Rendez vous : ${statusLabel(status).toLowerCase()}.`);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await appointmentService.cancel(appointment.id);
      toast.success('Rendez vous annulé.');
      setConfirmCancel(false);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open
        title="Rendez vous"
        onClose={onClose}
        busy={busy}
        footer={
          <>
            {cancellable && (
              <SecondaryButton onClick={() => setConfirmCancel(true)} disabled={busy} className="mr-auto text-red-700">
                Annuler le RDV
              </SecondaryButton>
            )}
            {next.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy}
                onClick={() => changeStatus(status)}
                className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {ACTION_LABELS[status]}
              </button>
            ))}
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-medium text-neutral-950">{appointmentClientName(appointment)}</p>
              {isWalkInAppointment(appointment) && <p className="text-sm text-neutral-500">Client de passage, sans fiche client</p>}
              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                {!isWalkInAppointment(appointment) && appointment.client?.phone && (
                  <a href={`tel:${appointment.client.phone}`} className="flex items-center gap-2 hover:text-neutral-950">
                    <Phone size={14} /> {appointment.client.phone}
                  </a>
                )}
                {!isWalkInAppointment(appointment) && appointment.client?.email && (
                  <a href={`mailto:${appointment.client.email}`} className="flex items-center gap-2 hover:text-neutral-950">
                    <Mail size={14} /> {appointment.client.email}
                  </a>
                )}
              </div>
            </div>
            <Badge tone={statusTone(APPOINTMENT_STATUS_TONES, appointment.status)}>{statusLabel(appointment.status)}</Badge>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
            <Clock size={16} />
            <span className="capitalize">{start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="tabular-nums">
              de {toTimeLabel(start)} à {toTimeLabel(end)}
            </span>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Prestations</p>
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {appointment.services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-neutral-950">{s.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <User size={12} /> {personName(s.employee) || 'Sans collaborateur'} · {formatDuration(s.duration)}
                    </p>
                  </div>
                  <span className="tabular-nums text-neutral-800">{formatMoney(s.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm font-semibold text-neutral-950">
              Total {formatMoney(appointment.totalPrice ?? appointment.services.reduce((t, s) => t + s.price, 0))}
            </p>
          </div>

          {appointment.notes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Note</p>
              <p className="text-sm text-neutral-700">{appointment.notes}</p>
            </div>
          )}
          {appointment.takenOnline && <p className="text-xs text-neutral-500">Réservé en ligne par le client.</p>}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmCancel}
        title="Annuler ce rendez vous ?"
        description="Le rendez vous sera placé dans la corbeille des RDV annulés et le client en sera informé."
        confirmLabel="Annuler le RDV"
        cancelLabel="Retour"
        destructive
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}
