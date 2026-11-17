'use client';

import { monthGrid } from '@/lib/agenda';
import { isSameDay, toISODate } from '@/lib/format';
import type { Appointment } from '@/lib/types/appointment';
import type { AppointmentDisplaySettings } from '@/lib/types/tenant';
import { AppointmentCard } from './AppointmentCard';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MAX_PER_DAY = 3;

export function MonthGrid({
  date,
  appointments,
  display,
  colorFor,
  onOpen,
  onOpenDay,
}: {
  date: Date;
  appointments: Appointment[];
  display?: AppointmentDisplaySettings;
  colorFor: (appointment: Appointment) => string | null | undefined;
  onOpen: (appointment: Appointment) => void;
  onOpenDay: (day: Date) => void;
}) {
  const today = new Date();
  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = toISODate(new Date(a.startTime));
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(date).map((day, i) => {
          if (!day) return <div key={i} className="min-h-32 border-b border-r border-neutral-100 bg-neutral-50/50" />;
          const items = (byDay.get(toISODate(day)) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className={`min-h-32 border-b border-r border-neutral-100 p-2 ${isToday ? 'bg-neutral-100' : ''}`} aria-current={isToday ? 'date' : undefined}>
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  isToday ? 'bg-neutral-950 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
                aria-label={`Voir le ${day.toLocaleDateString('fr-FR')}`}
              >
                {day.getDate()}
              </button>
              <div className="space-y-1">
                {items.slice(0, MAX_PER_DAY).map((a) => (
                  <AppointmentCard key={a.id} appointment={a} color={colorFor(a)} display={display} compact onOpen={onOpen} />
                ))}
                {items.length > MAX_PER_DAY && (
                  <button type="button" onClick={() => onOpenDay(day)} className="px-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-950">
                    {items.length - MAX_PER_DAY} de plus
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
