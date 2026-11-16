'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ClientSearch } from '@/components/clients/ClientSearch';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useServices } from '@/hooks/useReferenceData';
import { cashService, type Invoice, invoiceService } from '@/lib/api/services/invoice.service';
import { errorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';
import {
  CASH_MOVEMENT_TYPES,
  type CashMovementType,
  LEDGER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/lib/types/cash';
import { Select } from '@/components/ui/select';

function MethodSelect({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYMENT_METHODS.filter((m) => m !== 'ONLINE').map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={value === m}
          onClick={() => onChange(m)}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            value === m ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
          }`}
        >
          {PAYMENT_METHOD_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

/** New sale: client, services (with quantity) and payment method. */
export function SaleDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data: catalog } = useServices();
  const [client, setClient] = useState<Client | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const services = catalog?.services ?? [];
  const lines = services.filter((s) => (quantities[s.id] ?? 0) > 0);
  const total = lines.reduce((t, s) => t + s.price * quantities[s.id], 0);

  const change = (id: string, delta: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(20, (q[id] ?? 0) + delta)) }));

  const submit = async () => {
    if (!client) return setError('Choisissez un client.');
    if (lines.length === 0) return setError('Ajoutez au moins une prestation.');
    setBusy(true);
    setError(null);
    try {
      await invoiceService.createSale({
        clientId: client.id,
        items: lines.map((s) => ({ serviceId: s.id, quantity: quantities[s.id] })),
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      toast.success('Vente enregistrée.');
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title="Nouvelle vente"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <span className="mr-auto self-center text-lg font-medium tabular-nums text-neutral-950">{formatMoney(total)}</span>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Encaisser
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <FormField label="Client" group>
          <ClientSearch selected={client} onSelect={setClient} autoFocus />
        </FormField>
        <FormField label="Prestations" group>
          <ul className="max-h-72 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200">
            {services.map((s) => {
              const q = quantities[s.id] ?? 0;
              return (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className={q ? 'font-medium text-neutral-950' : 'text-neutral-700'}>{s.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-neutral-500">{formatMoney(s.price)}</span>
                    <button type="button" onClick={() => change(s.id, -1)} disabled={!q} className="rounded-full border border-neutral-200 p-1 disabled:opacity-30" aria-label={`Retirer ${s.name}`}>
                      <Minus size={14} />
                    </button>
                    <span className="w-4 text-center tabular-nums">{q}</span>
                    <button type="button" onClick={() => change(s.id, 1)} className="rounded-full border border-neutral-200 p-1" aria-label={`Ajouter ${s.name}`}>
                      <Plus size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </FormField>
        <FormField label="Moyen de paiement" group>
          <MethodSelect value={method} onChange={setMethod} />
        </FormField>
        <FormField label="Note (facultatif)">
          <input className={fieldClass} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

/** Manual drawer movement: deposit, withdrawal or refund. */
export function MovementDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<CashMovementType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setError('Montant invalide.');
    if (value > 1_000_000) return setError('Montant trop élevé.');
    if (type !== 'DEPOSIT' && !notes.trim()) return setError('Indiquez un motif pour un retrait ou un remboursement.');
    setBusy(true);
    setError(null);
    try {
      await cashService.create({ type, amount: Math.round(value * 100) / 100, paymentMethod: method, notes: notes.trim() || undefined });
      toast.success('Mouvement enregistré.');
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title="Mouvement de caisse"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <FormField label="Type">
          <Select value={type} onValueChange={(v) => setType(v as CashMovementType)}>
            {CASH_MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEDGER_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Montant (DH)">
          <input className={fieldClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Moyen de paiement" group>
          <MethodSelect value={method} onChange={setMethod} />
        </FormField>
        <FormField label={type === 'DEPOSIT' ? 'Note (facultatif)' : 'Motif'}>
          <input className={fieldClass} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

/** Collect a pending invoice. */
export function CollectDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>(invoice.paymentMethod && invoice.paymentMethod !== 'ONLINE' ? invoice.paymentMethod : 'CASH');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await invoiceService.markPaid(invoice.id, method);
      toast.success(`Facture ${invoice.invoiceNumber} encaissée.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title={`Encaisser ${invoice.invoiceNumber}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Encaisser {formatMoney(invoice.total)}
          </PrimaryButton>
        </>
      }
    >
      <ul className="mb-5 space-y-1 text-sm">
        {invoice.items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span className="text-neutral-700">
              {item.serviceName}
              {item.quantity > 1 ? ` x${item.quantity}` : ''}
            </span>
            <span className="tabular-nums">{formatMoney(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <FormField label="Moyen de paiement" group>
        <MethodSelect value={method} onChange={setMethod} />
      </FormField>
    </Modal>
  );
}
