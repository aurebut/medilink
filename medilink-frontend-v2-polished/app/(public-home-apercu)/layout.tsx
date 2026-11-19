import type { ReactNode } from 'react';
import { PublicDocument } from '@/components/marketing/PublicDocument';
import { publicMetadata } from '@/lib/seo';

// Design preview of the homepage: never indexed, absent from the sitemap and the navigation.
export const metadata = { ...publicMetadata, robots: { index: false, follow: false } };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicDocument variant="home" design="apercu">{children}</PublicDocument>;
}
