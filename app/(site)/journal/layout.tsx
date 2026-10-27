import type { Metadata } from 'next';

// Retired: the journal is Drago-knows now. Kept as a redirect, not indexed.
export const metadata: Metadata = {
  title: 'Journal',
  alternates: { canonical: '/drago-knows' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
