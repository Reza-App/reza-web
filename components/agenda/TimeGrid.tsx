'use client';

import { useEffect, useState } from 'react';
import { layoutDay } from '@/lib/agenda';
import { isSameDay } from '@/lib/format';
import type { Appointment } from '@/lib/types/appointment';
import type { AppointmentDisplaySettings } from '@/lib/types/tenant';
import { AppointmentCard } from './AppointmentCard';

const HOUR_PX = 64;
const SNAP_MIN = 15;
const PX_PER_MIN = HOUR_PX / 60;

interface TimeGridProps {
  days: Date[];
  appointments: Appointment[];
  startMinutes: number;
  endMinutes: number;
  display?: AppointmentDisplaySettings;
  colorFor: (appointment: Appointment) => string | null | undefined;
  onOpen: (appointment: Appointment) => void;
  onCreateAt: (start: Date) => void;
  onMove: (appointmentId: string, start: Date) => void;
}

/** Converts a vertical offset inside a day column into a snapped start time. */
function timeAt(day: Date, offsetY: number, startMinutes: number): Date {
  const minutes = startMinutes + Math.max(0, offsetY) / PX_PER_MIN;
  const snapped = Math.floor(minutes / SNAP_MIN) * SNAP_MIN;
  const date = new Date(day);
  date.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return date;
}

function NowLine({ startMinutes, endMinutes }: { startMinutes: number; endMinutes: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < startMinutes || minutes > endMinutes) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (minutes - startMinutes) * PX_PER_MIN }}>
      <div className="relative h-px bg-neutral-950">
        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-neutral-950" />
      </div>
    </div>
  );
}

export function TimeGrid({
  days,
  appointments,
  startMinutes,
  endMinutes,
  display,
  colorFor,
  onOpen,
  onCreateAt,
  onMove,
}: TimeGridProps) {
  const today = new Date();
  const hours: number[] = [];
  for (let m = Math.floor(startMinutes / 60) * 60; m < endMinutes; m += 60) hours.push(m);
  const height = (endMinutes - startMinutes) * PX_PER_MIN;

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <div style={{ minWidth: days.length > 1 ? 960 : undefined }}>
        <div className="sticky top-0 z-30 grid border-b border-neutral-200 bg-white" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="border-l border-neutral-100 py-3 text-center">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isToday ? 'text-neutral-950' : 'text-neutral-400'}`}>
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p
                  className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg ${
                    isToday ? 'bg-neutral-950 text-white' : 'text-neutral-900'
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
          <div className="relative" style={{ height }}>
            {hours.map((m) => (
              <span
                key={m}
                className={`absolute right-2 text-[11px] tabular-nums text-neutral-400 ${m > startMinutes ? "-translate-y-2" : "translate-y-1"}`}
                style={{ top: (m - startMinutes) * PX_PER_MIN }}
              >
                {String(Math.floor(m / 60)).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.startTime), day));
            const placed = layoutDay(dayAppointments, startMinutes, 22);
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-neutral-100 ${days.length > 1 && isSameDay(day, today) ? 'bg-neutral-100/70' : ''}`}
                style={{ height }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  onCreateAt(timeAt(day, e.nativeEvent.offsetY, startMinutes));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/appointment-id');
                  if (!id) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  onMove(id, timeAt(day, e.clientY - rect.top, startMinutes));
                }}
              >
                {hours.map((m) => (
                  <div
                    key={m}
                    className="pointer-events-none absolute inset-x-0 border-t border-neutral-100"
                    style={{ top: (m - startMinutes) * PX_PER_MIN }}
                  />
                ))}
                {isSameDay(day, today) && <NowLine startMinutes={startMinutes} endMinutes={endMinutes} />}
                {placed.map(({ item, top, height: h, lane, lanes }) => (
                  <div
                    key={item.id}
                    className="absolute z-10 p-0.5"
                    style={{
                      top: top * PX_PER_MIN,
                      height: h * PX_PER_MIN,
                      left: `${(lane / lanes) * 100}%`,
                      width: `${100 / lanes}%`,
                    }}
                  >
                    <AppointmentCard
                      appointment={item}
                      color={colorFor(item)}
                      display={display}
                      compact={h < 40}
                      draggable={!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(item.status)}
                      onOpen={onOpen}
                      style={{ height: '100%' }}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
