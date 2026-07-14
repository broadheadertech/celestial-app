import { ReactNode } from 'react';
import DcHeader from '@/components/dc/DcHeader';
import DcFooter from '@/components/dc/DcFooter';
import { DC_CSS } from '@/components/dc/styles';

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
    </div>
  );
}
