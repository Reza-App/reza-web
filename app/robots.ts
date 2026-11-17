import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Only the legal pages are crawled here; the client pages live on the client site. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/legal'], disallow: ['/dashboard', '/plateforme', '/api', '/login'] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
