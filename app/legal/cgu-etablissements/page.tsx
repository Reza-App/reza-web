import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const metadata: Metadata = { title: 'Conditions établissements | Selia' };

export default function ProTermsPage() {
  return (
    <LegalDocument
      title="Conditions générales des établissements"
      intro="Ces conditions s'appliquent aux salons et instituts qui utilisent Selia Pro."
      updated="novembre 2026"
      sections={[
        {
          title: 'Service',
          paragraphs: [
            'Selia Pro fournit à l’établissement un agenda, un fichier client, une caisse, des statistiques et la publication de ses prestations sur l’application et le site Selia, avec la réservation en ligne.',
          ],
        },
        {
          title: 'Abonnement et tarifs',
          paragraphs: [
            'L’abonnement comprend des frais d’activation par salon, payés une seule fois, et un montant mensuel selon le nombre de collaborateurs, aux tarifs affichés dans l’espace « Abonnement et paiement ».',
            'Le règlement se fait par virement bancaire. L’abonnement est activé ou prolongé à la validation du virement par Selia, qui émet alors la facture correspondante.',
          ],
        },
        {
          title: 'Échéance et renouvellement',
          paragraphs: [
            'Un rappel est envoyé avant la fin de chaque période. Faute de renouvellement, le salon reste visible quelques jours de grâce, puis il est masqué aux clients jusqu’au paiement.',
            'Les données de l’établissement (agenda, fichier client, historique) sont conservées pendant la suspension.',
          ],
        },
        {
          title: 'Obligations de l’établissement',
          paragraphs: [
            'L’établissement tient à jour ses prestations, ses prix, ses horaires et ses disponibilités, et honore les rendez vous confirmés.',
            'Il est seul responsable des prestations réalisées, de leur facturation au client et du respect de la réglementation applicable à son activité.',
          ],
        },
        {
          title: 'Données des clients',
          paragraphs: [
            'L’établissement n’utilise les données de ses clients que pour la gestion de leurs rendez vous et de leur relation commerciale, dans le respect de la loi 09-08 relative à la protection des données personnelles.',
          ],
        },
        {
          title: 'Avis',
          paragraphs: [
            'L’établissement modère les avis laissés par ses clients. Il peut signaler à Selia un avis faux ou injurieux. Selia peut retirer un avis contraire à ces conditions.',
          ],
        },
        {
          title: 'Résiliation',
          paragraphs: [
            'L’établissement peut cesser d’utiliser Selia à tout moment. Selia peut suspendre un compte en cas de manquement grave à ces conditions, après en avoir informé l’établissement.',
          ],
        },
        {
          title: 'Droit applicable',
          paragraphs: ['Ces conditions sont soumises au droit marocain.'],
        },
      ]}
    />
  );
}
