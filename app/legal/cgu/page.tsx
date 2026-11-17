import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const metadata: Metadata = { title: "Conditions d'utilisation | Selia" };

export default function ClientTermsPage() {
  return (
    <LegalDocument
      title="Conditions générales d'utilisation"
      intro="Ces conditions s'appliquent à l'utilisation de Selia par les clients, sur l'application et sur le site."
      updated="novembre 2026"
      sections={[
        {
          title: 'Objet',
          paragraphs: [
            'Selia est une plateforme qui permet de découvrir des salons et instituts de beauté et de réserver leurs prestations en ligne.',
            'Selia met en relation le client et l’établissement. La prestation elle même est réalisée et facturée par l’établissement, qui en est seul responsable.',
          ],
        },
        {
          title: 'Compte',
          paragraphs: [
            'La création d’un compte est gratuite. Vous vous engagez à fournir des informations exactes, notamment votre nom et votre numéro de téléphone, pour que l’établissement puisse vous joindre.',
            'Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte ».',
          ],
        },
        {
          title: 'Réservations',
          paragraphs: [
            'Une réservation peut être en attente de confirmation par l’établissement. Vous êtes prévenu dès qu’elle est confirmée.',
            'Vous pouvez réserver pour vous même et pour vos proches. Vous restez le contact de l’établissement pour toutes les personnes réservées.',
            'Les prix affichés sont ceux communiqués par l’établissement. Le règlement se fait directement auprès de lui.',
          ],
        },
        {
          title: 'Annulation et absence',
          paragraphs: [
            'Vous pouvez annuler en ligne tant que le délai fixé par l’établissement n’est pas dépassé. Passé ce délai, contactez directement l’établissement.',
            'En cas d’absences répétées sans annulation, un établissement peut refuser vos prochaines réservations en ligne.',
          ],
        },
        {
          title: 'Avis',
          paragraphs: [
            'Après une prestation, vous pouvez laisser un avis. Il doit refléter votre expérience réelle et rester courtois.',
            'L’établissement modère les avis avant publication. Selia peut retirer un avis faux, injurieux ou sans rapport avec la prestation.',
          ],
        },
        {
          title: 'Responsabilité',
          paragraphs: [
            'Selia s’efforce d’assurer l’accès au service en continu, sans pouvoir le garantir. Selia n’est pas responsable de la qualité des prestations réalisées par les établissements.',
          ],
        },
        {
          title: 'Données personnelles',
          paragraphs: ['L’utilisation de vos données est décrite dans la politique de confidentialité.'],
        },
        {
          title: 'Droit applicable',
          paragraphs: ['Ces conditions sont soumises au droit marocain. En cas de litige, une solution amiable est recherchée avant toute action.'],
        },
      ]}
    />
  );
}
