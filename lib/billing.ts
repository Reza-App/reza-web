import type { BadgeTone } from '@/components/ui/page';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionState {
  label: string;
  tone: BadgeTone;
  /** One sentence telling the owner where they stand and what to do. */
  message: string;
}

/**
 * What the owner sees about their subscription. The stored status stays
 * ACTIVE until the server sweep runs, so the dates decide here.
 */
export function subscriptionState(
  input: { status: string; currentPeriodEnd?: string | null; total: number; renewalDue: boolean; pending: boolean; graceDays: number },
  now = Date.now(),
): SubscriptionState {
  const end = input.currentPeriodEnd ? new Date(input.currentPeriodEnd).getTime() : null;
  const day = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const pending = input.pending ? ' Votre virement est en cours de vérification.' : '';

  if (input.status === 'CANCELED') return { label: 'Résilié', tone: 'red', message: 'Votre abonnement est résilié. Contactez Selia pour le réactiver.' };
  if (input.status === 'NONE' || !end) {
    return { label: 'Non activé', tone: 'muted', message: `Vos salons ne sont pas encore visibles par les clients. Choisissez votre formule et réglez la par virement pour les publier.${pending}` };
  }
  const graceEnd = end + input.graceDays * DAY_MS;
  if (input.status === 'PAST_DUE' || now >= graceEnd) {
    return { label: 'Expiré', tone: 'red', message: `Vos salons sont masqués depuis le ${day(graceEnd)}. Ils réapparaissent dès la validation de votre virement.${pending}` };
  }
  if (now >= end) {
    return { label: 'Période de grâce', tone: 'amber', message: `Votre période s'est terminée le ${day(end)}. Renouvelez avant le ${day(graceEnd)} pour que vos salons restent visibles.${pending}` };
  }
  if (input.renewalDue && input.total > 0) {
    return { label: 'À renouveler', tone: 'amber', message: `Votre période se termine le ${day(end)}. Vous pouvez dès maintenant régler la suivante.${pending}` };
  }
  return { label: 'Actif', tone: 'green', message: `Votre abonnement court jusqu'au ${day(end)}.${pending}` };
}
