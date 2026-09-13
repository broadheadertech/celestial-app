import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Journal',
  description: 'Notes on arowana care, bloodlines and keeping exotic fish.',
  alternates: { canonical: '/journal' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
