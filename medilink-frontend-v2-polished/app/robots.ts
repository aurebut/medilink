import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // Let crawlers read the noindex directive on account/search pages.
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: `${SITE_URL}/sitemap.xml` };
}
