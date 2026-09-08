import type { MetadataRoute } from 'next';
import { guides } from '@/content/guides';
import { SITE_URL, EDITORIAL_DATE } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['/', '/remplacement-medical', '/trouver-medecin-remplacant', '/guides'].map(path => ({ url: `${SITE_URL}${path === '/' ? '' : path}`, lastModified: EDITORIAL_DATE })),
    ...guides.map(guide => ({ url: `${SITE_URL}/guides/${guide.slug}`, lastModified: guide.updated })),
  ];
}
