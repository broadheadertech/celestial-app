import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'Specimen',
  description: 'Photos, papers and husbandry details for this specimen.',
  alternates: { canonical: '/specimen-detail' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
