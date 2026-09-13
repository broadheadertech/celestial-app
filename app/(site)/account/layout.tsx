import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'My Account',
  description: 'Your orders and reservations.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/account' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
