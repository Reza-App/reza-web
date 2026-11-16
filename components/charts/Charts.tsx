'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Selia charts: black and white identity. One series is ink black; a second
 * series is mid grey AND dashed (never identified by colour alone), always
 * with a legend. Thin marks, recessive grid, single y axis, hover tooltips.
 */
export const INK = '#0a0a0a';
export const INK_2 = '#8a8a8a';
const GRID = '#ececec';
const AXIS = '#8a8a8a';

const axisProps = {
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string | number;
  format?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-neutral-950">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-neutral-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name} : <span className="font-medium tabular-nums text-neutral-950">{format ? format(Number(p.value)) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface Series {
  key: string;
  label: string;
}

function seriesStyle(index: number) {
  return index === 0 ? { color: INK, dash: undefined } : { color: INK_2, dash: '5 4' };
}

export function BarChartView<T extends object>({
  data,
  x,
  series,
  height = 260,
  format,
  tickFormat,
  layout = 'horizontal',
}: {
  data: T[];
  x: keyof T & string;
  series: Series[];
  height?: number;
  format?: (value: number) => string;
  /** Shorter label for the value axis (the tooltip keeps format). */
  tickFormat?: (value: number) => string;
  /** 'vertical' draws horizontal bars (long category names). */
  layout?: 'horizontal' | 'vertical';
}) {
  const vertical = layout === 'vertical';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} barGap={2} margin={{ top: 8, right: 8, left: vertical ? 8 : -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={format} />
            <YAxis type="category" dataKey={x} {...axisProps} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={tickFormat ?? format} allowDecimals={false} />
          </>
        )}
        <Tooltip cursor={{ fill: '#f4f4f4' }} content={<ChartTooltip format={format} />} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#525252' }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={seriesStyle(i).color}
            radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={vertical ? 18 : 28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineChartView<T extends object>({
  data,
  x,
  series,
  height = 260,
  format,
  area = false,
  yDomain,
}: {
  data: T[];
  x: keyof T & string;
  series: Series[];
  height?: number;
  format?: (value: number) => string;
  area?: boolean;
  /** Fixed scale, e.g. [0, 5] for a rating. */
  yDomain?: [number, number];
}) {
  const common = (
    <>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey={x} {...axisProps} />
      <YAxis {...axisProps} tickFormatter={format} allowDecimals={false} domain={yDomain} />
      <Tooltip cursor={{ stroke: '#d4d4d4' }} content={<ChartTooltip format={format} />} />
      {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#525252' }} />}
    </>
  );
  if (area) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          {common}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={seriesStyle(i).color}
              strokeDasharray={seriesStyle(i).dash}
              strokeWidth={2}
              fill={seriesStyle(i).color}
              fillOpacity={i === 0 ? 0.08 : 0}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {common}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.label}
            stroke={seriesStyle(i).color}
            strokeDasharray={seriesStyle(i).dash}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Part of a whole as a thin horizontal meter (replaces pie charts). */
export function ShareBars({ items, format }: { items: { label: string; value: number }[]; format?: (v: number) => string }) {
  const total = items.reduce((t, i) => t + i.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct = (item.value / total) * 100;
        return (
          <li key={item.label}>
            <div className="mb-1 flex justify-between gap-4 text-sm">
              <span className="truncate text-neutral-700">{item.label}</span>
              <span className="tabular-nums text-neutral-950">
                {format ? format(item.value) : item.value} <span className="text-neutral-400">· {Math.round(pct)} %</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-neutral-950" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
