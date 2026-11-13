import type { Metadata } from 'next';
import { PlatformShell } from '@/components/platform/PlatformShell';

export const metadata: Metadata = { title: 'Plateforme | Selia' };

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
