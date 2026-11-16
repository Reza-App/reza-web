import type { Metadata } from 'next';
import { ClientAuthProvider } from '@/contexts/ClientAuthContext';

export const metadata: Metadata = {
  title: { default: 'Selia', template: '%s | Selia' },
  description: 'Trouvez un salon et réservez en ligne avec Selia.',
};

/** Client area: its own session, shared by the account pages and the app pages. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientAuthProvider>{children}</ClientAuthProvider>;
}
