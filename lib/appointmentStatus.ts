import type { AppointmentStatus } from '@/lib/types/appointment';

/**
 * Same life cycle as the API (RezaBackend/src/modules/appointment/statusRules.ts):
 * the dashboard only offers what the server accepts at this moment.
 */
export const EARLY_START_MINUTES = 30;

const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CONFIRMED', 'CANCELLED'],
  COMPLETED: ['CONFIRMED'],
  NO_SHOW: ['CONFIRMED'],
  CANCELLED: ['CONFIRMED'],
};

/** Whether `from -> to` is accepted for an appointment starting at `start`. */
export function canChangeStatus(from: AppointmentStatus, to: AppointmentStatus, start: Date, now = Date.now(), end?: Date): boolean {
  if (!NEXT[from]?.includes(to)) return false;
  const s = start.getTime();
  if (to === 'IN_PROGRESS' && now < s - EARLY_START_MINUTES * 60_000) return false;
  // Past its end time a visit is finished or missed, not started.
  if (to === 'IN_PROGRESS' && end && now >= end.getTime()) return false;
  if ((to === 'COMPLETED' || to === 'NO_SHOW') && from !== 'IN_PROGRESS' && now < s) return false;
  if (from === 'CANCELLED' && now >= s) return false;
  return true;
}

export interface StatusAction {
  to: AppointmentStatus;
  label: string;
  /** primary: the expected next step; secondary: undo or side action. */
  kind: 'primary' | 'secondary';
}

/** Buttons of the appointment sheet, the expected next step last. */
export function statusActions(status: AppointmentStatus, start: Date, now = Date.now(), end?: Date): StatusAction[] {
  const options: Record<AppointmentStatus, StatusAction[]> = {
    PENDING: [
      { to: 'NO_SHOW', label: 'Client absent', kind: 'secondary' },
      { to: 'COMPLETED', label: 'Terminer', kind: 'secondary' },
      { to: 'CONFIRMED', label: 'Confirmer', kind: 'primary' },
    ],
    CONFIRMED: [
      { to: 'NO_SHOW', label: 'Client absent', kind: 'secondary' },
      { to: 'IN_PROGRESS', label: 'Démarrer', kind: 'secondary' },
      { to: 'COMPLETED', label: 'Terminer', kind: 'primary' },
    ],
    IN_PROGRESS: [
      { to: 'CONFIRMED', label: 'Annuler le démarrage', kind: 'secondary' },
      { to: 'COMPLETED', label: 'Terminer', kind: 'primary' },
    ],
    COMPLETED: [{ to: 'CONFIRMED', label: 'Annuler « terminé »', kind: 'secondary' }],
    NO_SHOW: [{ to: 'CONFIRMED', label: 'Annuler « absent »', kind: 'secondary' }],
    CANCELLED: [{ to: 'CONFIRMED', label: 'Restaurer', kind: 'primary' }],
  };
  return (options[status] ?? []).filter((a) => canChangeStatus(status, a.to, start, now, end));
}

/** A line explaining what is not possible yet, or null. */
export function statusHint(status: AppointmentStatus, start: Date, now = Date.now()): string | null {
  if ((status === 'PENDING' || status === 'CONFIRMED') && now < start.getTime() - EARLY_START_MINUTES * 60_000) {
    return 'Démarrer, Terminer et Client absent seront disponibles à l’heure du rendez vous.';
  }
  if (status === 'CANCELLED' && now >= start.getTime()) return 'Ce rendez vous est passé : il ne peut plus être restauré.';
  if (status === 'COMPLETED') return 'Si le rendez vous est déjà encaissé, annulez d’abord sa facture dans la caisse.';
  return null;
}
