'use client';

import { ChevronLeft, ChevronRight, Filter, UserCheck } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';
import { useEmployees } from '@/hooks/useReferenceData';
import { monthGrid, parseAgendaFilters } from '@/lib/agenda';
import { isSameDay, personName, toISODate } from '@/lib/format';
import { STATUS_LABELS, type AppointmentStatus } from '@/lib/types/appointment';
import { APPOINTMENT_STATUS_TONES, STATUS_DOT, statusTone } from '@/lib/status';

const STATUS_FILTERS: (AppointmentStatus | 'all')[] = ['all', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
      }`}
    >
      {children}
    </button>
  );
}

export function AgendaSidebar() {
  const { get, set } = useUrlState();
  const filters = parseAgendaFilters((k) => get(k) || null);
  const { data: employees } = useEmployees();
  const today = new Date();
  const cells = monthGrid(filters.date);

  const goMonth = (delta: number) => {
    const d = new Date(filters.date.getFullYear(), filters.date.getMonth() + delta, 1);
    set({ date: toISODate(d) });
  };

  return (
    <div className="space-y-7">
      <section aria-label="Calendrier">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => goMonth(-1)} className="rounded-full p-1.5 hover:bg-neutral-100" aria-label="Mois précédent">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-sm font-semibold capitalize text-neutral-950">
            {filters.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={() => goMonth(1)} className="rounded-full p-1.5 hover:bg-neutral-100" aria-label="Mois suivant">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((d, i) => (
            <div key={i} className="py-1 text-center text-[11px] font-medium text-neutral-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) =>
            day ? (
              <button
                key={i}
                type="button"
                onClick={() => set({ date: toISODate(day) })}
                aria-pressed={isSameDay(day, filters.date)}
                className={`aspect-square rounded-full text-xs font-medium transition-colors ${
                  isSameDay(day, filters.date)
                    ? 'bg-neutral-950 text-white'
                    : isSameDay(day, today)
                      ? 'text-neutral-950 ring-1 ring-neutral-950'
                      : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {day.getDate()}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <UserCheck size={14} />
          Collaborateurs
        </h3>
        <div className="flex flex-wrap gap-2">
          <Chip active={!filters.employeeId} onClick={() => set({ employee: null })}>
            Tous
          </Chip>
          {(employees ?? [])
            .filter((e) => e.isActive)
            .map((employee) => (
              <Chip key={employee.id} active={filters.employeeId === employee.id} onClick={() => set({ employee: employee.id })}>
                {personName(employee)}
              </Chip>
            ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <Filter size={14} />
          Statut
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              active={(filters.status ?? 'all') === status}
              onClick={() => set({ status: status === 'all' ? null : status })}
            >
              {status === 'all' ? (
                'Tous'
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[statusTone(APPOINTMENT_STATUS_TONES, status)]}`} aria-hidden />
                  {STATUS_LABELS[status]}
                </span>
              )}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}
