import type { Metadata } from "next";
import { Red_Hat_Display, Red_Hat_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const redHatDisplay = Red_Hat_Display({
  variable: "--font-red-hat-display",
  subsets: ["latin"],
});

const redHatMono = Red_Hat_Mono({
  variable: "--font-red-hat-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WellbePro - Gestion simplifiée de votre entreprise",
  description: "Gestion simplifiée de votre entreprise avec wellbepro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${redHatDisplay.variable} ${redHatMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
