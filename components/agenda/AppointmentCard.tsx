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

const NEUTRAL = '#0a0a0a';
const VALID_HEX = /^#[0-9a-f]{6}$/i;

function rgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Cancelled and no show appointments lose their colour: they no longer take the slot. */
const isOff = (status: string) => status === 'CANCELLED' || status === 'NO_SHOW';

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
  const off = isOff(appointment.status);
  const showColor = (display?.showColorInRDV ?? true) && !!color && VALID_HEX.test(color);
  const accent = off ? '#a3a3a3' : showColor ? color! : NEUTRAL;
  const pending = appointment.status === 'PENDING';
  const inProgress = appointment.status === 'IN_PROGRESS';
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const title = `${appointmentClientName(appointment)} : ${serviceSummary(appointment)} (${statusLabel(appointment.status)})`;
  const dragProps = {
    draggable,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/appointment-id', appointment.id);
      e.dataTransfer.effectAllowed = 'move';
    },
  };

  // Month view: one light line, a dot in the collaborator's colour.
  if (compact) {
    return (
      <button
        type="button"
        {...dragProps}
        onClick={() => onOpen(appointment)}
        title={title}
        style={style}
        className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-[3px] text-left text-xs transition hover:bg-neutral-100 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={pending || off ? { boxShadow: `inset 0 0 0 1.5px ${accent}` } : { backgroundColor: accent }}
        />
        <span className={`shrink-0 tabular-nums ${off ? 'text-neutral-400' : 'text-neutral-500'}`}>{toTimeLabel(start)}</span>
        <span className={`truncate ${off ? 'text-neutral-400 line-through' : 'font-medium text-neutral-900'}`}>{appointmentClientName(appointment) || 'Client'}</span>
      </button>
    );
  }

  // Day and week views: flat block, light tint and a coloured edge.
  const blockStyle: React.CSSProperties = inProgress
    ? { backgroundColor: accent, borderLeft: `3px solid ${accent}` }
    : {
        backgroundColor: off ? '#f5f5f5' : rgba(accent, showColor ? 0.1 : 0.05),
        borderLeft: `3px ${pending ? 'dashed' : 'solid'} ${accent}`,
      };

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
      {...dragProps}
      onClick={() => onOpen(appointment)}
      title={title}
      style={{ ...blockStyle, ...style }}
      className={`flex w-full flex-col items-stretch justify-start overflow-hidden rounded-md px-2 py-1 text-left text-xs leading-snug transition hover:brightness-95 ${
        inProgress ? 'text-white' : off ? 'text-neutral-400 line-through' : 'text-neutral-950'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {fields.map(render)}
    </button>
  );
}
