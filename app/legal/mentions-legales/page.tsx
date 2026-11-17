'use client';

import { LegalDocument } from '@/components/legal/LegalDocument';
import { useApiQuery } from '@/hooks/useApiQuery';
import { legalService } from '@/lib/api/services/legal.service';

/** Legal notice: the company identity comes from the platform billing settings. */
export default function LegalNoticePage() {
  const query = useApiQuery('legal-identity', (signal) => legalService.identity(signal));
  const c = query.data;
  const identity = [
    c?.companyName ? `Raison sociale : ${c.companyName}` : 'Raison sociale : Selia',
    c?.companyAddress ? `Siège : ${c.companyAddress}` : null,
    c?.companyIce ? `ICE : ${c.companyIce}` : null,
    c?.companyRc ? `RC : ${c.companyRc}` : null,
    c?.companyIf ? `IF : ${c.companyIf}` : null,
  ].filter((l): l is string => !!l);

  return (
    <LegalDocument
      title="Mentions légales"
      updated="novembre 2026"
      sections={[
        { title: 'Éditeur', paragraphs: identity },
        {
          title: 'Hébergement',
          paragraphs: ['Le site et les applications Selia sont hébergés par des prestataires d’hébergement en nuage, dans des centres de données sécurisés.'],
        },
        {
          title: 'Propriété intellectuelle',
          paragraphs: [
            'La marque Selia, son logo et les contenus du service sont protégés. Toute reproduction sans autorisation est interdite.',
            'Les photos et descriptions des établissements restent la propriété de ces établissements.',
          ],
        },
        {
          title: 'Contact',
          paragraphs: ['Pour toute question, ou pour exercer vos droits sur vos données, contactez Selia depuis l’application ou par email.'],
        },
      ]}
    />
  );
}
