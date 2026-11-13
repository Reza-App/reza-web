'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AppointmentDetailsDialog } from '@/components/agenda/AppointmentDetailsDialog';
import { MonthGrid } from '@/components/agenda/MonthGrid';
import { NewAppointmentDialog } from '@/components/agenda/NewAppointmentDialog';
import { TimeGrid } from '@/components/agenda/TimeGrid';
import { ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useEmployees, useServices } from '@/hooks/useReferenceData';
import { useUrlState } from '@/hooks/useUrlState';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AgendaView,
  DEFAULT_AGENDA_VIEW,
  employeeIds,
  involvesEmployee,
  parseAgendaFilters,
  rangeQuery,
  shiftDate,
  timeToMinutes,
  visibleRange,
} from '@/lib/agenda';
import { appointmentService } from '@/lib/api/services/appointment.service';
import { tenantService } from '@/lib/api/services/tenant.service';
import { errorMessage } from '@/lib/api/errors';
import { addDays, atTime, capitalize, toISODate } from '@/lib/format';
import type { Appointment } from '@/lib/types/appointment';
import { useUrlAction } from '@/hooks/useUrlAction';

const VIEW_LABELS: Record<AgendaView, string> = { day: 'Jour', week: 'Semaine', month: 'Mois' };
const DEFAULT_START = 8 * 60;
const DEFAULT_END = 21 * 60;
/** Generous page size: one request covers a full month of a busy salon. */
const RANGE_LIMIT = 1000;

export default function AgendaPage() {
  const toast = useToast();
  const { activeSalon } = useAuth();
  const { get, set } = useUrlState();
  const filters = parseAgendaFilters((k) => get(k) || null);
  const { view, date } = filters;
  const range = rangeQuery(view, date);

  const { data: employees } = useEmployees();
  const { data: catalog } = useServices();
  const settings = useApiQuery(activeSalon ? `agenda-settings:${activeSalon.id}` : null, async (signal) => {
    const [hours, display] = await Promise.all([tenantService.businessHours(signal), tenantService.displaySettings(signal)]);
    return { hours, display };
  });

  const appointments = useApiQuery(
    activeSalon ? `appointments:${activeSalon.id}:${range.startDate}:${range.endDate}:${filters.status ?? ''}` : null,
    (signal) =>
      appointmentService.list(
        { ...range, status: filters.status ?? undefined, limit: RANGE_LIMIT },
        signal,
      ),
  );

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [createAt, setCreateAt] = useState<Date | null>(null);
  useUrlAction({ new: () => setCreateAt(atTime(view === 'month' ? new Date() : date, '10:00')) });

  const visible = useMemo(() => {
    const list = appointments.data?.appointments ?? [];
    if (!filters.employeeId) return list;
    // Until the team is loaded, the selected id alone is used.
    const employee = employees?.find((e) => e.id === filters.employeeId) ?? { id: filters.employeeId };
    return list.filter((a) => involvesEmployee(a, employee));
  }, [appointments.data, filters.employeeId, employees]);

  const colorFor = useCallback(
    (a: Appointment) => {
      const employeeId = a.employee?.id ?? a.services[0]?.employee?.id;
      const employeeColor = employeeId ? employees?.find((e) => employeeIds(e).has(employeeId))?.agendaSettings?.color : undefined;
      if (employeeColor) return employeeColor;
      return catalog?.services.find((s) => s.id === a.services[0]?.serviceId)?.color;
    },
    [employees, catalog],
  );

  // Grid bounds: the salon agenda hours, widened to fit every appointment shown.
  const [startMinutes, endMinutes] = useMemo(() => {
    let start = timeToMinutes(settings.data?.hours.agendaStart, DEFAULT_START);
    let end = Math.min(timeToMinutes(settings.data?.hours.agendaEnd, DEFAULT_END), 24 * 60);
    if (end - start > 14 * 60) end = start + 14 * 60;
    for (const a of visible) {
      const s = new Date(a.startTime);
      const e = new Date(a.endTime);
      start = Math.min(start, s.getHours() * 60);
      end = Math.max(end, e.getHours() * 60 + (e.getMinutes() ? 60 : 0));
    }
    return [Math.floor(start / 60) * 60, Math.min(Math.ceil(end / 60) * 60, 24 * 60)];
  }, [settings.data, visible]);

  const days = useMemo(() => {
    const { start, end } = visibleRange(view, date);
    const list: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) list.push(d);
    return list;
  }, [view, date]);

  const move = async (id: string, start: Date) => {
    const appointment = visible.find((a) => a.id === id);
    if (!appointment || new Date(appointment.startTime).getTime() === start.getTime()) return;
    try {
      await appointmentService.move(id, start);
      toast.success('Rendez vous déplacé.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      void appointments.refetch();
    }
  };

  const headerTitle =
    view === 'month'
      ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
        : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const count = visible.filter((a) => a.status !== 'CANCELLED').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-3xl font-medium text-neutral-950">{capitalize(headerTitle)}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {appointments.loading ? 'Chargement...' : `${count} rendez vous`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => set({ date: toISODate(new Date()) })}
              className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Aujourd&apos;hui
            </button>
            <button type="button" onClick={() => set({ date: toISODate(shiftDate(view, date, -1)) })} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Période précédente">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => set({ date: toISODate(shiftDate(view, date, 1)) })} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Période suivante">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-neutral-100 p-1" role="tablist" aria-label="Vue">
            {(Object.keys(VIEW_LABELS) as AgendaView[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => set({ view: v === DEFAULT_AGENDA_VIEW ? null : v })}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${view === v ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-950'}`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCreateAt(atTime(view === 'month' ? new Date() : date, '10:00'))}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <Plus size={16} /> Nouveau
          </button>
        </div>
      </header>

      {appointments.error ? (
        <ErrorState message={appointments.error} onRetry={appointments.refetch} />
      ) : view === 'month' ? (
        <MonthGrid
          date={date}
          appointments={visible}
          display={settings.data?.display}
          colorFor={colorFor}
          onOpen={setSelected}
          onOpenDay={(day) => set({ view: 'day', date: toISODate(day) })}
        />
      ) : (
        <TimeGrid
          days={days}
          appointments={visible}
          startMinutes={startMinutes}
          endMinutes={endMinutes}
          display={settings.data?.display}
          colorFor={colorFor}
          onOpen={setSelected}
          onCreateAt={setCreateAt}
          onMove={move}
        />
      )}

      <AppointmentDetailsDialog appointment={selected} onClose={() => setSelected(null)} onChanged={appointments.refetch} />
      {createAt && <NewAppointmentDialog initialStart={createAt} onClose={() => setCreateAt(null)} onCreated={appointments.refetch} />}
    </div>
  );
}
