import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import DcHeader from '@/components/dc/DcHeader';
import DcFooter from '@/components/dc/DcFooter';
import { DC_CSS } from '@/components/dc/styles';
import CartDrawer from '@/components/site/CartDrawer';

const SITE_URL = 'https://dc.broadheader.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dragon's Cave — Premium Asian Arowana in Quezon City",
    template: "%s · Dragon's Cave",
  },
  description:
    "Premium Asian arowana and exotic fish, chosen for bloodline and quarantined before sale. Browse the gallery, book a viewing, or shop aquarium food, lights and gear.",
  openGraph: {
    type: 'website',
    siteName: "Dragon's Cave",
    locale: 'en_PH',
    images: [{ url: '/img/red.webp', width: 900, height: 600, alt: 'Super Red arowana' }],
  },
  twitter: { card: 'summary_large_image' },
};

// The storefront allows pinch-zoom (the root layout disables it for the app screens).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#A02323',
};

/**
 * Storefront shell — the imported Dragon's Cave design, verbatim.
 * Uses the design's own header/footer (not the app's SiteHeader) so every
 * (site) page reads exactly like the shared design.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="dc-scope"
      style={{
        fontFamily: "'Geist', system-ui, sans-serif",
        background: 'oklch(0.972 0.008 78)',
        color: 'oklch(0.19 0.012 32)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: DC_CSS }} />
      <DcHeader />
      <div style={{ flex: 1 }}>{children}</div>
      <DcFooter />
      <CartDrawer />
    </div>
  );
}
