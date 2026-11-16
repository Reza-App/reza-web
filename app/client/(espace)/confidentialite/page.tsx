import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de confidentialité' };

/** Same wording as the mobile app privacy screen. */
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Données collectées',
    items: [
      'Les informations que vous fournissez lors de la création de votre compte : prénom, nom, adresse email, numéro de téléphone, et les informations facultatives que vous choisissez d’ajouter (photo de profil, genre, date de naissance).',
      'Les informations liées à votre activité sur la plateforme : réservations, avis, favoris, et proches ajoutés.',
      'Des données techniques lors de l’utilisation du service (adresse IP, type d’appareil) afin d’assurer son bon fonctionnement et sa sécurité.',
    ],
  },
  {
    title: 'Utilisation des données',
    items: [
      'Gérer vos réservations auprès des salons partenaires.',
      'Vous permettre de retrouver vos proches, avis et favoris.',
      'Vous envoyer des notifications liées à vos réservations et, si vous y consentez, des communications sur nos services.',
    ],
  },
  {
    title: 'Partage des données',
    items: [
      'Vos informations de contact (nom, téléphone) sont partagées avec le salon que vous réservez, uniquement dans le cadre de votre réservation.',
      'Nous ne vendons jamais vos données personnelles à des tiers.',
    ],
  },
  {
    title: 'Conservation des données',
    items: [
      'Vos données sont conservées le temps nécessaire à la fourniture du service. Vous pouvez demander la suppression de votre compte et de vos données à tout moment.',
    ],
  },
  {
    title: 'Vos droits',
    items: [
      'Conformément à la réglementation applicable en matière de protection des données, vous disposez d’un droit d’accès, de rectification, d’opposition et de suppression de vos données personnelles.',
      'Pour exercer ces droits, contactez nous depuis l’application ou par email.',
    ],
  },
  {
    title: 'Sécurité',
    items: [
      'Vos données sont protégées par des mesures techniques et organisationnelles appropriées. Les mots de passe sont stockés de manière sécurisée et ne sont jamais conservés en clair.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-10">
        <h1 className="text-3xl font-medium tracking-tight text-neutral-950 sm:text-4xl">Politique de confidentialité</h1>
        <p className="mt-3 text-neutral-500">Comment Selia protège vos données.</p>
        <p className="mt-1 text-sm text-neutral-400">Dernière mise à jour : août 2026</p>
      </header>
      <ol className="space-y-8">
        {SECTIONS.map((section, i) => (
          <li key={section.title} className="rounded-3xl border border-neutral-200 p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-medium text-neutral-950">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm text-white">{i + 1}</span>
              {section.title}
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-neutral-600 marker:text-neutral-300">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  );
}
