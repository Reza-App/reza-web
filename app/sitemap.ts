import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Legal pages of the pro site; salons and discovery are listed by the client site. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ['/legal/cgu', '/legal/cgu-etablissements', '/legal/mentions-legales'].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.2,
  }));
}
