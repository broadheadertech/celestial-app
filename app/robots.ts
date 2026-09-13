import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/client', '/auth', '/account', '/checkout', '/onboarding'],
    },
    sitemap: 'https://dc.broadheader.com/sitemap.xml',
  };
}
