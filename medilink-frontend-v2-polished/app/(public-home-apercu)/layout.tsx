import type { ReactNode } from 'react';
import '@/app/brand-tokens.css';
import { publicMetadata } from '@/lib/seo';

// From-scratch homepage design preview: its own document, never indexed, absent from the sitemap and the navigation.
export const metadata = { ...publicMetadata, robots: { index: false, follow: false } };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0A1330' };

// Runs before first paint: motion states apply only when script runs and motion is welcome,
// and are dropped again if the page's scripts never take over.
const boot = `(function(){var d=document.documentElement;if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('ap-js');setTimeout(function(){if(!window.__apReveal)d.classList.remove('ap-js')},6000)})()`;

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="fr" suppressHydrationWarning><head>
    <link rel="preload" href="/landing-assets/fraunces-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <script dangerouslySetInnerHTML={{ __html: boot }} />
  </head><body className="ap">{children}</body></html>;
}
