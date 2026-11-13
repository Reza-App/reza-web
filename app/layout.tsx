import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Red_Hat_Display, Red_Hat_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/toast';

const redHatDisplay = Red_Hat_Display({
  variable: '--font-red-hat-display',
  subsets: ['latin'],
});

const redHatMono = Red_Hat_Mono({
  variable: '--font-red-hat-mono',
  subsets: ['latin'],
});

/** Geometric display face, close to the Selia wordmark. */
const futura = localFont({
  variable: '--font-futura',
  display: 'swap',
  src: [
    { path: '../public/fonts/futura-pro/FuturaLTProBook.otf', weight: '400', style: 'normal' },
    { path: '../public/fonts/futura-pro/FuturaLTProMedium.otf', weight: '500', style: 'normal' },
    { path: '../public/fonts/futura-pro/FuturaLTProBold.otf', weight: '700', style: 'normal' },
  ],
});

export const metadata: Metadata = {
  title: {
    default: 'Selia Pro',
    template: '%s | Selia Pro',
  },
  description: 'Selia Pro, la gestion de votre salon : agenda, clients, caisse et statistiques.',
  applicationName: 'Selia Pro',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${redHatDisplay.variable} ${redHatMono.variable} ${futura.variable} antialiased`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
