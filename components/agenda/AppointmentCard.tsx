'use client';

import { toTimeLabel } from '@/lib/format';
import { type Appointment, appointmentClientName, serviceSummary, statusLabel } from '@/lib/types/appointment';
import type { AppointmentDisplaySettings, DisplayField } from '@/lib/types/tenant';

const DEFAULT_FIELDS: DisplayField[] = [
  { id: 'hours', label: 'Horaires', visible: true, order: 1 },
  { id: 'clientName', label: 'Nom du client', visible: true, order: 2 },
  { id: 'services', label: 'Prestations', visible: true, order: 3 },
  { id: 'notes', label: 'Note', visible: false, order: 4 },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-dashed border-neutral-400 bg-white text-neutral-900',
  CONFIRMED: 'border-neutral-900 bg-white text-neutral-950',
  IN_PROGRESS: 'border-neutral-950 bg-neutral-950 text-white',
  COMPLETED: 'border-neutral-200 bg-neutral-100 text-neutral-700',
  CANCELLED: 'border-neutral-200 bg-neutral-50 text-neutral-400 line-through',
  NO_SHOW: 'border-neutral-300 bg-neutral-50 text-neutral-500',
};

/** Light tint of a hex colour for the card background. */
function tint(hex: string | undefined | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.55)`,
    borderLeft: `3px solid ${hex}`,
  };
}

export function AppointmentCard({
  appointment,
  color,
  display,
  compact = false,
  draggable = false,
  onOpen,
  style,
}: {
  appointment: Appointment;
  color?: string | null;
  display?: AppointmentDisplaySettings;
  compact?: boolean;
  draggable?: boolean;
  onOpen: (appointment: Appointment) => void;
  style?: React.CSSProperties;
}) {
  const fields = [...(display?.fields?.length ? display.fields : DEFAULT_FIELDS)]
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);
  const useColor = (display?.showColorInRDV ?? true) && !['CANCELLED', 'NO_SHOW'].includes(appointment.status);
  const colorStyle = useColor ? tint(color) : undefined;
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);

  const render = (field: DisplayField) => {
    switch (field.id) {
      case 'hours':
        return (
          <p key="hours" className="text-[11px] tabular-nums opacity-70">
            {toTimeLabel(start)} {toTimeLabel(end)}
          </p>
        );
      case 'clientName':
        return (
          <p key="client" className="truncate font-semibold">
            {appointmentClientName(appointment) || 'Client'}
          </p>
        );
      case 'services':
        return (
          <p key="services" className="truncate opacity-75">
            {serviceSummary(appointment)}
          </p>
        );
      case 'notes':
        return appointment.notes ? (
          <p key="notes" className="truncate italic opacity-60">
            {appointment.notes}
          </p>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/appointment-id', appointment.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(appointment)}
      title={`${appointmentClientName(appointment)} : ${serviceSummary(appointment)} (${statusLabel(appointment.status)})`}
      style={{ ...colorStyle, ...style }}
      className={`flex w-full flex-col items-stretch justify-start overflow-hidden rounded-lg border px-2 py-1 text-left text-xs leading-snug shadow-sm transition hover:shadow-md ${
        colorStyle ? 'text-neutral-950' : STATUS_STYLE[appointment.status] ?? STATUS_STYLE.CONFIRMED
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {compact ? (
        <span className="block truncate">
          <span className="tabular-nums opacity-70">{toTimeLabel(start)}</span> {appointmentClientName(appointment)}
        </span>
      ) : (
        fields.map(render)
      )}
    </button>
  );
}
