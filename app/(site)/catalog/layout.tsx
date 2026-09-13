import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'The Catalog — Asian Arowana',
  description: 'Asian arowana on display now: Super Red, Crossback, Red Tail Gold and more. Every specimen chipped, certified and quarantined.',
  alternates: { canonical: '/catalog' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
