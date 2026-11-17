'use client';

import { Printer } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { SecondaryButton } from '@/components/ui/modal';
import { formatDate, formatMoney } from '@/lib/format';

export interface InvoiceDocumentData {
  invoice: {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    paidAt: string | null;
    status: string;
    paymentMethod: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    amount: number;
    tax: number;
    total: number;
    vatRate: number;
    currency: string;
  };
  items: { serviceName: string; price: number; quantity: number }[];
  issuer: { name: string; address: string | null; ice: string | null; rc: string | null; if: string | null; patente: string | null; bankName: string | null; bankRib: string | null };
  customer: { salon: string | null; address: string | null; owner: string | null; email: string | null; phone: string | null };
}

const METHOD: Record<string, string> = { BANK_TRANSFER: 'Virement bancaire', CASH: 'Espèces', CARD: 'Carte', CHECK: 'Chèque', ONLINE: 'Paiement en ligne' };

/**
 * A Selia subscription invoice laid out like a printed page, with the legal
 * mentions required in Morocco (ICE, RC, IF, patente). « Imprimer » also saves
 * it as PDF from the browser dialog.
 */
export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const { invoice, items, issuer, customer } = data;
  const legal = [
    issuer.ice && `ICE ${issuer.ice}`,
    issuer.rc && `RC ${issuer.rc}`,
    issuer.if && `IF ${issuer.if}`,
    issuer.patente && `Patente ${issuer.patente}`,
  ].filter(Boolean);
  const missingLegal = !issuer.ice || !issuer.rc || !issuer.if;

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        {missingLegal ? (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Mentions légales incomplètes : renseignez ICE, RC et IF dans la tarification de la plateforme.</p>
        ) : (
          <span />
        )}
        <SecondaryButton onClick={() => window.print()}>
          <Printer size={16} /> Imprimer ou enregistrer en PDF
        </SecondaryButton>
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 text-sm text-neutral-800 print:max-w-none print:rounded-none print:border-0 print:p-0 sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-8">
          <div>
            <Logo variant="pro" height={34} />
            <p className="mt-4 font-medium text-neutral-950">{issuer.name}</p>
            {issuer.address && <p className="whitespace-pre-line text-neutral-600">{issuer.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-medium tracking-tight text-neutral-950">Facture</p>
            <p className="mt-1 font-medium text-neutral-950">{invoice.invoiceNumber}</p>
            <p className="mt-3 text-neutral-600">Émise le {formatDate(invoice.createdAt)}</p>
            {invoice.paidAt && <p className="text-neutral-600">Payée le {formatDate(invoice.paidAt)}</p>}
          </div>
        </header>

        <section className="grid gap-6 border-b border-neutral-200 py-8 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Facturé à</p>
            <p className="mt-2 font-medium text-neutral-950">{customer.salon ?? '-'}</p>
            {customer.owner && <p>{customer.owner}</p>}
            {customer.address && <p className="text-neutral-600">{customer.address}</p>}
            {customer.email && <p className="text-neutral-600">{customer.email}</p>}
            {customer.phone && <p className="text-neutral-600">{customer.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Objet</p>
            <p className="mt-2 text-neutral-950">Abonnement Selia</p>
            {invoice.periodStart && (
              <p className="text-neutral-600">
                Du {formatDate(invoice.periodStart)} au {formatDate(invoice.periodEnd)}
              </p>
            )}
            <p className="text-neutral-600">Règlement : {METHOD[invoice.paymentMethod ?? ''] ?? '-'}</p>
          </div>
        </section>

        <table className="mt-8 w-full">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.12em] text-neutral-400">
              <th className="pb-3 font-semibold">Désignation</th>
              <th className="pb-3 text-right font-semibold">Qté</th>
              <th className="pb-3 text-right font-semibold">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            {(items.length ? items : [{ serviceName: 'Abonnement Selia', price: invoice.total, quantity: 1 }]).map((it, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-3 text-neutral-950">{it.serviceName}</td>
                <td className="py-3 text-right tabular-nums">{it.quantity}</td>
                <td className="py-3 text-right tabular-nums">{formatMoney(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-full max-w-xs space-y-1.5">
          <p className="flex justify-between text-neutral-600">
            <span>Total HT</span>
            <span className="tabular-nums">{formatMoney(invoice.amount)}</span>
          </p>
          <p className="flex justify-between text-neutral-600">
            <span>TVA {invoice.vatRate ? `${invoice.vatRate.toLocaleString('fr-FR')} %` : ''}</span>
            <span className="tabular-nums">{formatMoney(invoice.tax)}</span>
          </p>
          <p className="flex justify-between border-t border-neutral-200 pt-2 text-base font-medium text-neutral-950">
            <span>Total TTC</span>
            <span className="tabular-nums">{formatMoney(invoice.total)}</span>
          </p>
          {invoice.tax === 0 && <p className="pt-1 text-xs text-neutral-500">TVA non applicable.</p>}
        </div>

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-center text-xs leading-relaxed text-neutral-500">
          <p>
            {issuer.name}
            {issuer.address ? `, ${issuer.address.replace(/\n/g, ', ')}` : ''}
          </p>
          {legal.length > 0 && <p>{legal.join(' · ')}</p>}
          {issuer.bankRib && (
            <p>
              {issuer.bankName ? `${issuer.bankName}, ` : ''}RIB {issuer.bankRib}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
