import { ReactNode } from 'react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import CartDrawer from '@/components/site/CartDrawer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="storefront" style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}
