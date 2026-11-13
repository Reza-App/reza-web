'use client';

import { CreditCard } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';
import {
  CASH_PERIOD_LABELS,
  CASH_PERIODS,
  LEDGER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type LedgerType,
} from '@/lib/types/cash';

const LEDGER_TYPES: LedgerType[] = ['SALE', 'REFUND', 'DEPOSIT', 'WITHDRAWAL'];

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CaisseSidebar() {
  const { get, set } = useUrlState();

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        <CreditCard size={14} />
        Filtres caisse
      </h3>
      <FilterGroup
        label="Période"
        value={get('period', 'month')}
        onChange={(v) => set({ period: v === 'month' ? null : v })}
        options={CASH_PERIODS.map((p) => ({ value: p, label: CASH_PERIOD_LABELS[p] }))}
      />
      <FilterGroup
        label="Type"
        value={get('type', 'all')}
        onChange={(v) => set({ type: v })}
        options={[{ value: 'all', label: 'Tous' }, ...LEDGER_TYPES.map((t) => ({ value: t, label: LEDGER_TYPE_LABELS[t] }))]}
      />
      <FilterGroup
        label="Moyen de paiement"
        value={get('method', 'all')}
        onChange={(v) => set({ method: v })}
        options={[{ value: 'all', label: 'Tous' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))]}
      />
    </div>
  );
}
