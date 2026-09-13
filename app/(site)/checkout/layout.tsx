import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Place your order for food, lights and gear.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/checkout' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
