import { ClientShell } from '@/components/client/ClientShell';

/** Discovery, salon pages and the client's account, inside the client frame. */
export default function ClientSpaceLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
