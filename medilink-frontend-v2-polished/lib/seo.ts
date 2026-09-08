import type { Metadata } from 'next';

export const SITE_URL = 'https://medilink-web.com';
export const EDITORIAL_DATE = '2026-09-08';
export const isPreview = process.env.VERCEL_ENV === 'preview';

export const publicMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'MédiLink — Remplacement médical', template: '%s — MédiLink' },
  applicationName: 'MédiLink',
  icons: { icon: '/favicon.svg' },
  robots: { index: !isPreview, follow: true },
};

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: `${title} — MédiLink` },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — MédiLink`, description, url: path,
      type: 'website', siteName: 'MédiLink', locale: 'fr_FR',
      images: [{ url: '/landing-assets/seo-social.jpg', width: 1200, height: 630, alt: 'MédiLink — Préparer ses remplacements médicaux' }],
    },
    twitter: { card: 'summary_large_image', title: `${title} — MédiLink`, description, images: ['/landing-assets/seo-social.jpg'] },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
