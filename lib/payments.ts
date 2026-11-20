/** Payment methods a salon can accept on site (TenantSettings.acceptedPayments). */
export const ACCEPTED_PAYMENTS = [
  { code: 'CASH', label: 'Espèces' },
  { code: 'CARD', label: 'Carte bancaire (TPE)' },
  { code: 'TRANSFER', label: 'Virement' },
  { code: 'CHECK', label: 'Chèque' },
] as const;

export type AcceptedPayment = (typeof ACCEPTED_PAYMENTS)[number]['code'];

export const isAcceptedPayment = (v: unknown): v is AcceptedPayment => ACCEPTED_PAYMENTS.some((p) => p.code === v);
