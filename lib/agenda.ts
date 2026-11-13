import { addDays, parseISODate, startOfDay, startOfWeek, toISODate } from './format';
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus } from './types/appointment';

export type AgendaView = 'day' | 'week' | 'month';

export interface AgendaFilters {
  view: AgendaView;
  date: Date;
  employeeId: string | null;
  status: AppointmentStatus | null;
}

const VIEWS: AgendaView[] = ['day', 'week', 'month'];
/** View opened when the URL does not name one. */
export const DEFAULT_AGENDA_VIEW: AgendaView = 'month';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the agenda filters from the URL, falling back to safe defaults. */
export function parseAgendaFilters(get: (key: string) => string | null, today = new Date()): AgendaFilters {
  const view = get('view');
  const date = get('date');
  const status = get('status');
  return {
    view: VIEWS.includes(view as AgendaView) ? (view as AgendaView) : DEFAULT_AGENDA_VIEW,
    date: date && DATE_RE.test(date) ? parseISODate(date) : startOfDay(today),
    employeeId: get('employee') || null,
    status: APPOINTMENT_STATUSES.includes(status as AppointmentStatus) ? (status as AppointmentStatus) : null,
  };
}

/** First and last calendar day displayed by a view (inclusive). */
export function visibleRange(view: AgendaView, date: Date): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(date), end: startOfDay(date) };
  if (view === 'week') {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: first, end: last };
}

export function shiftDate(view: AgendaView, date: Date, direction: 1 | -1): Date {
  if (view === 'day') return addDays(date, direction);
  if (view === 'week') return addDays(date, 7 * direction);
  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}

/** Month grid: leading nulls so that the first column is Monday. */
export function monthGrid(date: Date): (Date | null)[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  return cells;
}

/**
 * Ids an appointment may use for an employee: appointments point to the
 * employee's user account (userId), which can differ from the Employee id.
 */
export function employeeIds(employee: { id: string; userId?: string | null }): Set<string> {
  return new Set([employee.id, employee.userId].filter((id): id is string => Boolean(id)));
}

/** True when the appointment involves the employee (main or per service). */
export function involvesEmployee(appointment: Appointment, employee: { id: string; userId?: string | null }): boolean {
  const ids = employeeIds(employee);
  if (appointment.employee && ids.has(appointment.employee.id)) return true;
  return appointment.services.some((s) => Boolean(s.employee && ids.has(s.employee.id)));
}

export interface PlacedEvent<T> {
  item: T;
  /** Minutes from the top of the grid. */
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

/**
 * Places the events of one day column: position from the start time and
 * side by side lanes when they overlap (greedy, cluster by cluster).
 */
export function layoutDay<T extends { startTime: string; endTime: string }>(
  items: T[],
  gridStartMinutes: number,
  minHeight = 20,
): PlacedEvent<T>[] {
  const toMin = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  const sorted = [...items].sort((a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(b.endTime) - toMin(a.endTime));

  const placed: PlacedEvent<T>[] = [];
  let cluster: PlacedEvent<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    cluster.forEach((p) => (p.lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    const start = toMin(item.startTime);
    const end = Math.max(toMin(item.endTime), start + 1);
    if (start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    clusterEnd = Math.max(clusterEnd, end);
    const event = { item, top: start - gridStartMinutes, height: Math.max(end - start, minHeight), lane, lanes: 1 };
    cluster.push(event);
    placed.push(event);
  }
  flush();
  return placed;
}

export function timeToMinutes(time: string | undefined, fallback: number): number {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return fallback;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function rangeQuery(view: AgendaView, date: Date) {
  const { start, end } = visibleRange(view, date);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}
