'use client';

import { ClientOnly } from '@/components/ui/client-only';

/** Sign in, sign up and password pages: full screen, no client frame. */
export default function ClientAccountPagesLayout({ children }: { children: React.ReactNode }) {
  return <ClientOnly>{children}</ClientOnly>;
}
