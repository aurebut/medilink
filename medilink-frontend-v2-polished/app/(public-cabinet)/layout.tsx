import type { ReactNode } from 'react';
import { PublicDocument } from '@/components/marketing/PublicDocument';
import '../persona-editorial.css';
import '../(public-home)/interface-previews.css';
import '../persona-content.css';
export { publicMetadata as metadata } from '@/lib/seo';
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#EEF3F8' };

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicDocument variant="establishment">{children}</PublicDocument>;
}
