import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Contact',
  description: 'Message us about a specimen, an order or a visit.',
  alternates: { canonical: '/contact' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
