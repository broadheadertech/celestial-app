import type { Metadata } from 'next';

// Server layout so this client-rendered page still gets its own title/description.
export const metadata: Metadata = {
  title: 'The Cave — Exotic Fish',
  description: 'Discus, stingrays, cichlids, predators and oddballs from our gallery water. Enquire about any specimen.',
  alternates: { canonical: '/cave' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
