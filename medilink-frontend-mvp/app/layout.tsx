import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Médilink MVP',
  description: 'Plateforme de mise en relation médicale — MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
