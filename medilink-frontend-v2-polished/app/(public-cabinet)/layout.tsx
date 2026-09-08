import type { ReactNode } from 'react';
import { PublicDocument } from '@/components/marketing/PublicDocument';
export { publicMetadata as metadata } from '@/lib/seo';
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#EBF5F3' };

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicDocument variant="establishment">{children}</PublicDocument>;
}
