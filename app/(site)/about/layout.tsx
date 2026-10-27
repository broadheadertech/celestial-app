import type { Metadata } from 'next';

// Retired: the about content moved into The Cave. Kept as a redirect, not indexed.
export const metadata: Metadata = {
  title: 'About',
  alternates: { canonical: '/cave' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
