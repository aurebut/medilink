import type { ReactNode } from 'react';
import { PublicDocument } from '@/components/marketing/PublicDocument';
export { publicMetadata as metadata } from '@/lib/seo';

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicDocument variant="home">{children}</PublicDocument>;
}
